/**
 * DS18B20 → ThermalTrace push ingest (AVR GNU assembly).
 *
 * Board: Arduino Uno / ATmega328P @ 16 MHz + W5100 Ethernet shield.
 * Not Arduino C, not Python: avr-gcc assembles this .S, avrdude flashes it.
 *
 * No popular Ethernet MCU requires assembly. Chips that do (PADAUK, PIC10F)
 * cannot run TCP. This is the assembly-language path we can actually support
 * on garage Ethernet hardware.
 *
 * W5100 cannot TLS. Same LAN HTTP→HTTPS relay as ethernet_dht22_ingest:
 * sketches/relay/push_https_forward.py
 *
 * Wiring (shield uses D10–D13 SPI and D4 as SD CS — do not put the probe on D4):
 *   DS18B20 VDD 5V, GND, data → D7 (PD7), 4.7k to 5V
 *
 *   avr-gcc -mmcu=atmega328p -nostartfiles -nostdlib -o ingest.elf main.S
 *   avr-objcopy -O ihex ingest.elf ingest.hex
 *   avrdude -c arduino -p m328p -P /dev/ttyACM0 -b 115200 -U flash:w:ingest.hex:i
 *
 * Serial 115200: "link ok", then "POST 200"
 * Static IP 192.168.1.177, relay 192.168.1.50:8080 (edit ingest_ip / ingest_port).
 */

#define __SFR_OFFSET 0
#include <avr/io.h>

#define SS_BIT     2
#define OW_BIT     7
#define SD_CS_BIT  4

	.section .vectors,"ax",@progbits
	.global __vectors
__vectors:
	rjmp	reset
	.rept	25
	reti
	.endr

	.section .text
reset:
	cli
	ldi	r16, lo8(RAMEND)
	out	SPL, r16
	ldi	r16, hi8(RAMEND)
	out	SPH, r16
	clr	r1
	rjmp	main

/* r25:r24 = microseconds (~4 cycles per count after scale). */
delay_us:
	lsl	r24
	rol	r25
	lsl	r24
	rol	r25
1:
	sbiw	r24, 1
	brne	1b
	ret

/* r25:r24 = milliseconds. */
delay_ms:
	push	r16
	push	r17
	movw	r16, r24
2:
	ldi	r24, lo8(1000)
	ldi	r25, hi8(1000)
	rcall	delay_us
	sbiw	r16, 1
	brne	2b
	pop	r17
	pop	r16
	ret

spi_xfer:
	out	SPDR, r24
3:
	in	r16, SPSR
	sbrs	r16, SPIF
	rjmp	3b
	in	r24, SPDR
	ret

/* X = W5100 address, r22 = data */
w5100_write:
	cbi	PORTB, SS_BIT
	ldi	r24, 0xF0
	rcall	spi_xfer
	mov	r24, r27
	rcall	spi_xfer
	mov	r24, r26
	rcall	spi_xfer
	mov	r24, r22
	rcall	spi_xfer
	sbi	PORTB, SS_BIT
	ret

w5100_read:
	cbi	PORTB, SS_BIT
	ldi	r24, 0x0F
	rcall	spi_xfer
	mov	r24, r27
	rcall	spi_xfer
	mov	r24, r26
	rcall	spi_xfer
	ldi	r24, 0
	rcall	spi_xfer
	sbi	PORTB, SS_BIT
	mov	r22, r24
	ret

w5100_write16:
	push	r22
	mov	r22, r23
	rcall	w5100_write
	adiw	r26, 1
	pop	r22
	rcall	w5100_write
	ret

w5100_cmd:
	ldi	r26, 0x01
	ldi	r27, 0x04
	rcall	w5100_write
4:
	ldi	r26, 0x01
	ldi	r27, 0x04
	rcall	w5100_read
	tst	r22
	brne	4b
	ret

uart_init:
	ldi	r16, (1 << U2X0)
	sts	UCSR0A, r16
	ldi	r16, 16
	sts	UBRR0L, r16
	sts	UBRR0H, r1
	ldi	r16, (1 << UCSZ01) | (1 << UCSZ00)
	sts	UCSR0C, r16
	ldi	r16, (1 << TXEN0)
	sts	UCSR0B, r16
	ret

uart_putc:
	lds	r16, UCSR0A
	sbrs	r16, UDRE0
	rjmp	uart_putc
	sts	UDR0, r24
	ret

uart_pstr:
	lpm	r24, Z+
	cpi	r24, 0
	breq	5f
	rcall	uart_putc
	rjmp	uart_pstr
5:
	ret

ow_low:
	sbi	DDRD, OW_BIT
	cbi	PORTD, OW_BIT
	ret

ow_release:
	cbi	DDRD, OW_BIT
	cbi	PORTD, OW_BIT
	ret

ow_reset:
	cli
	rcall	ow_low
	ldi	r24, lo8(480)
	ldi	r25, hi8(480)
	rcall	delay_us
	rcall	ow_release
	ldi	r24, 70
	ldi	r25, 0
	rcall	delay_us
	in	r17, PIND
	ldi	r24, lo8(410)
	ldi	r25, hi8(410)
	rcall	delay_us
	sei
	sbrc	r17, OW_BIT
	rjmp	6f
	clr	r24
	ret
6:
	ldi	r24, 1
	ret

ow_write_bit:
	cli
	push	r22
	rcall	ow_low
	pop	r22
	tst	r22
	breq	7f
	ldi	r24, 6
	ldi	r25, 0
	rcall	delay_us
	rcall	ow_release
	ldi	r24, 64
	ldi	r25, 0
	rcall	delay_us
	rjmp	8f
7:
	ldi	r24, 60
	ldi	r25, 0
	rcall	delay_us
	rcall	ow_release
	ldi	r24, 10
	ldi	r25, 0
	rcall	delay_us
8:
	sei
	ret

ow_read_bit:
	cli
	rcall	ow_low
	ldi	r24, 6
	ldi	r25, 0
	rcall	delay_us
	rcall	ow_release
	ldi	r24, 9
	ldi	r25, 0
	rcall	delay_us
	in	r16, PIND
	bst	r16, OW_BIT
	ldi	r24, 55
	ldi	r25, 0
	rcall	delay_us
	sei
	clr	r22
	bld	r22, 0
	ret

ow_write_byte:
	ldi	r18, 8
9:
	mov	r22, r24
	andi	r22, 1
	push	r24
	push	r18
	rcall	ow_write_bit
	pop	r18
	pop	r24
	lsr	r24
	dec	r18
	brne	9b
	ret

ow_read_byte:
	ldi	r18, 8
	clr	r19
10:
	push	r18
	push	r19
	rcall	ow_read_bit
	pop	r19
	pop	r18
	lsr	r19
	sbrc	r22, 0
	ori	r19, 0x80
	dec	r18
	brne	10b
	mov	r24, r19
	ret

/* unsigned r25:r24 * r22 → r25:r24 (low 16) */
umul16x8:
	mul	r24, r22
	movw	r18, r0
	mul	r25, r22
	add	r19, r0
	clr	r1
	movw	r24, r18
	ret

/* unsigned r25:r24 / r22 → r25:r24 */
udiv16x8:
	clr	r18
	ldi	r20, 16
11:
	lsl	r24
	rol	r25
	rol	r18
	sub	r18, r22
	brcc	12f
	add	r18, r22
	rjmp	13f
12:
	ori	r24, 1
13:
	dec	r20
	brne	11b
	ret

/* r24=0 ok and r22 = °F integer; r24=1 fail */
ds18b20_read:
	rcall	ow_reset
	tst	r24
	brne	14f
	ldi	r24, 0xCC
	rcall	ow_write_byte
	ldi	r24, 0x44
	rcall	ow_write_byte
	ldi	r24, lo8(750)
	ldi	r25, hi8(750)
	rcall	delay_ms
	rcall	ow_reset
	tst	r24
	brne	14f
	ldi	r24, 0xCC
	rcall	ow_write_byte
	ldi	r24, 0xBE
	rcall	ow_write_byte
	rcall	ow_read_byte
	mov	r20, r24
	rcall	ow_read_byte
	mov	r25, r24
	mov	r24, r20
	/* F = raw * 9 / 80 + 32 */
	ldi	r22, 9
	rcall	umul16x8
	ldi	r22, 80
	rcall	udiv16x8
	adiw	r24, 32
	mov	r22, r24
	clr	r24
	ret
14:
	ldi	r24, 1
	ret

append_pstr:
15:
	lpm	r16, Z+
	cpi	r16, 0
	breq	16f
	st	Y+, r16
	rjmp	15b
16:
	ret

fmt_u8:
	clr	r18
17:
	cpi	r22, 10
	brcs	18f
	subi	r22, 10
	inc	r18
	rjmp	17b
18:
	cpi	r18, 10
	brcs	19f
	mov	r16, r18
	ldi	r17, '0'
	clr	r18
20:
	cpi	r16, 10
	brcs	21f
	subi	r16, 10
	inc	r18
	rjmp	20b
21:
	mov	r17, r18
	ori	r17, '0'
	st	Y+, r17
	mov	r18, r16
19:
	tst	r18
	breq	22f
	mov	r16, r18
	ori	r16, '0'
	st	Y+, r16
22:
	mov	r16, r22
	ori	r16, '0'
	st	Y+, r16
	ret

build_http:
	ldi	r28, lo8(body_buf)
	ldi	r29, hi8(body_buf)
	ldi	r30, lo8(str_body0)
	ldi	r31, hi8(str_body0)
	rcall	append_pstr
	lds	r22, temp_f
	rcall	fmt_u8
	ldi	r16, '}'
	st	Y+, r16
	st	Y, r1
	ldi	r28, lo8(body_buf)
	ldi	r29, hi8(body_buf)
	clr	r17
23:
	ld	r16, Y+
	cpi	r16, 0
	breq	24f
	inc	r17
	rjmp	23b
24:
	ldi	r28, lo8(http_buf)
	ldi	r29, hi8(http_buf)
	ldi	r30, lo8(str_post)
	ldi	r31, hi8(str_post)
	rcall	append_pstr
	ldi	r30, lo8(ingest_path)
	ldi	r31, hi8(ingest_path)
	rcall	append_pstr
	ldi	r30, lo8(str_hdr)
	ldi	r31, hi8(str_hdr)
	rcall	append_pstr
	mov	r22, r17
	rcall	fmt_u8
	ldi	r30, lo8(str_end)
	ldi	r31, hi8(str_end)
	rcall	append_pstr
	ldi	r30, lo8(body_buf)
	ldi	r31, hi8(body_buf)
27:
	ld	r16, Z+
	cpi	r16, 0
	breq	28f
	st	Y+, r16
	rjmp	27b
28:
	st	Y, r1
	ret

w5100_init:
	ldi	r26, 0
	ldi	r27, 0
	ldi	r22, 0x80
	rcall	w5100_write
	ldi	r24, 100
	ldi	r25, 0
	rcall	delay_ms
	ldi	r26, 0
	ldi	r27, 0
	ldi	r22, 0
	rcall	w5100_write
	ldi	r30, lo8(net_cfg)
	ldi	r31, hi8(net_cfg)
	ldi	r26, 1
	ldi	r27, 0
	ldi	r18, 18
29:
	lpm	r22, Z+
	push	r18
	push	r26
	push	r27
	rcall	w5100_write
	pop	r27
	pop	r26
	pop	r18
	adiw	r26, 1
	dec	r18
	brne	29b
	ldi	r26, 0x1A
	ldi	r27, 0
	ldi	r22, 0x55
	rcall	w5100_write
	ldi	r26, 0x1B
	rcall	w5100_write
	ret

http_post:
	ldi	r22, 0x10
	rcall	w5100_cmd
	ldi	r26, 0x00
	ldi	r27, 0x04
	ldi	r22, 0x01
	rcall	w5100_write
	ldi	r26, 0x04
	ldi	r27, 0x04
	ldi	r23, 0x9C
	ldi	r22, 0x40
	rcall	w5100_write16
	ldi	r22, 0x01
	rcall	w5100_cmd
	ldi	r26, 0x03
	ldi	r27, 0x04
	rcall	w5100_read
	cpi	r22, 0x13
	brne	40f
	ldi	r30, lo8(ingest_ip)
	ldi	r31, hi8(ingest_ip)
	ldi	r26, 0x0C
	ldi	r27, 0x04
	ldi	r18, 4
30:
	lpm	r22, Z+
	push	r18
	push	r26
	push	r27
	rcall	w5100_write
	pop	r27
	pop	r26
	pop	r18
	adiw	r26, 1
	dec	r18
	brne	30b
	ldi	r26, 0x10
	ldi	r27, 0x04
	ldi	r30, lo8(ingest_port)
	ldi	r31, hi8(ingest_port)
	lpm	r23, Z+
	lpm	r22, Z
	rcall	w5100_write16
	ldi	r22, 0x04
	rcall	w5100_cmd
	ldi	r18, 200
31:
	ldi	r26, 0x03
	ldi	r27, 0x04
	rcall	w5100_read
	cpi	r22, 0x17
	breq	32f
	ldi	r24, 10
	ldi	r25, 0
	rcall	delay_ms
	dec	r18
	brne	31b
	rjmp	40f
32:
	ldi	r28, lo8(http_buf)
	ldi	r29, hi8(http_buf)
	clr	r17
33:
	ld	r16, Y+
	cpi	r16, 0
	breq	34f
	inc	r17
	rjmp	33b
34:
	ldi	r28, lo8(http_buf)
	ldi	r29, hi8(http_buf)
	ldi	r26, 0x00
	ldi	r27, 0x40
	mov	r18, r17
35:
	ld	r22, Y+
	push	r18
	push	r26
	push	r27
	rcall	w5100_write
	pop	r27
	pop	r26
	pop	r18
	adiw	r26, 1
	dec	r18
	brne	35b
	ldi	r26, 0x24
	ldi	r27, 0x04
	clr	r23
	mov	r22, r17
	rcall	w5100_write16
	ldi	r22, 0x20
	rcall	w5100_cmd
	ldi	r18, 100
36:
	ldi	r26, 0x02
	ldi	r27, 0x04
	rcall	w5100_read
	sbrc	r22, 4
	rjmp	37f
	ldi	r24, 10
	ldi	r25, 0
	rcall	delay_ms
	dec	r18
	brne	36b
	rjmp	40f
37:
	ldi	r22, 0x10
	ldi	r26, 0x02
	ldi	r27, 0x04
	rcall	w5100_write
	ldi	r18, 50
38:
	ldi	r26, 0x26
	ldi	r27, 0x04
	rcall	w5100_read
	mov	r19, r22
	ldi	r26, 0x27
	ldi	r27, 0x04
	rcall	w5100_read
	or	r19, r22
	brne	39f
	ldi	r24, 10
	ldi	r25, 0
	rcall	delay_ms
	dec	r18
	brne	38b
	rjmp	40f
39:
	ldi	r26, 0x09
	ldi	r27, 0x60
	rcall	w5100_read
	cpi	r22, '2'
	brne	40f
	ldi	r30, lo8(msg_200)
	ldi	r31, hi8(msg_200)
	rcall	uart_pstr
	rjmp	41f
40:
	ldi	r30, lo8(msg_fail)
	ldi	r31, hi8(msg_fail)
	rcall	uart_pstr
41:
	ldi	r22, 0x08
	rcall	w5100_cmd
	ldi	r22, 0x10
	rcall	w5100_cmd
	ret

	.global main
main:
	rcall	uart_init
	sbi	DDRB, SS_BIT
	sbi	PORTB, SS_BIT
	sbi	DDRB, 3
	sbi	DDRB, 5
	cbi	DDRB, 4
	sbi	DDRD, SD_CS_BIT
	sbi	PORTD, SD_CS_BIT
	rcall	ow_release
	ldi	r16, (1 << SPE) | (1 << MSTR) | (1 << SPR0)
	out	SPCR, r16
	rcall	w5100_init
	ldi	r30, lo8(msg_link)
	ldi	r31, hi8(msg_link)
	rcall	uart_pstr
loop:
	rcall	ds18b20_read
	tst	r24
	brne	50f
	sts	temp_f, r22
	rcall	build_http
	rcall	http_post
	rjmp	51f
50:
	ldi	r30, lo8(msg_ow)
	ldi	r31, hi8(msg_ow)
	rcall	uart_pstr
51:
	ldi	r24, lo8(60000)
	ldi	r25, hi8(60000)
	rcall	delay_ms
	rjmp	loop

ingest_path:
	.asciz	"/api/ingest/YOUR_DEVICE_KEY"
ingest_ip:
	.byte	192, 168, 1, 50
ingest_port:
	.byte	0x1F, 0x90
net_cfg:
	.byte	192, 168, 1, 1
	.byte	255, 255, 255, 0
	.byte	0xDE, 0xAD, 0xBE, 0xEF, 0xFE, 0xED
	.byte	192, 168, 1, 177
str_post:
	.asciz	"POST "
str_hdr:
	.ascii	" HTTP/1.1\r\nHost: 192.168.1.50\r\nContent-Type: application/json\r\nContent-Length: "
	.byte	0
str_end:
	.ascii	"\r\nConnection: close\r\n\r\n"
	.byte	0
str_body0:
	.asciz	"{\"temp1\":"
msg_link:
	.asciz	"link ok\r\n"
msg_200:
	.asciz	"POST 200\r\n"
msg_fail:
	.asciz	"POST fail\r\n"
msg_ow:
	.asciz	"DS18B20 fail (D7)\r\n"

	.section .bss
http_buf:
	.skip	384
body_buf:
	.skip	24
temp_f:
	.skip	1
