/**
 * DS18B20 → ThermalTrace push ingest (Microchip PIC18F67J60).
 *
 * Drop-in application layer for the classic Microchip TCP/IP Stack (MLA /
 * "TCPIP Stack") Ethernet demo on PIC18F67J60 (onboard MAC + 10BASE-T PHY).
 * Not Arduino, not Python: MPLAB X + XC8.
 *
 * The PIC stack has no maintained HTTPS client for Cloudflare. Use the same
 * LAN HTTP→HTTPS relay as Uno + W5100 / STM32 / CH32V / Teensy 4.1.
 *
 * 1. Create a push device. Download this file from Devices (path pre-filled).
 * 2. Run sketches/relay/push_https_forward.py on a LAN host.
 * 3. Set INGEST_HOST to that machine (dotted IPv4).
 * 4. Open an MLA TCPIP Ethernet demo for PIC18F67J60 in MPLAB X, keep the
 *    stack sources, add/replace this application module, build, PICkit flash.
 * 5. UART 115200: dhcp/link ok, then POST 200.
 *
 * Wiring: DS18B20 VDD 3.3V (level-shift if the board is 5V-only IO), GND,
 * data → PORTDbits.RD0 (change OW_* if your demo uses another free pin),
 * 4.7k pull-up to VDD.
 *
 * Requires the demo's TCPIP.h / Tick.h / Delay.h and a periodic StackTask()
 * pump (usually already in MainDemo.c). Call ThermalTraceAppInit() after
 * stack init; call ThermalTraceAppTask() from the main loop alongside StackTask().
 */

#include "TCPIP Stack/TCPIP.h"
#include "TCPIP Stack/Tick.h"
#include <stdio.h>
#include <string.h>

#ifndef INGEST_HOST
#define INGEST_HOST "192.168.1.50"
#endif
#ifndef INGEST_PORT
#define INGEST_PORT 8080
#endif
#ifndef INGEST_PATH
#define INGEST_PATH "/api/ingest/YOUR_DEVICE_KEY"
#endif

#define INTERVAL_TICKS (TICK_SECOND * 60u)

/* 1-Wire on RD0 — change if the Ethernet demo already uses this pin. */
#define OW_TRIS TRISDbits.TRISD0
#define OW_LAT LATDbits.LATD0
#define OW_PORT PORTDbits.RD0

static TCP_SOCKET httpSock = INVALID_SOCKET;
static DWORD lastPostTick;
static char httpBuf[320];
static WORD httpLen;
static WORD httpSent;

static void ow_drive_low(void)
{
	OW_LAT = 0;
	OW_TRIS = 0;
}

static void ow_release(void)
{
	OW_TRIS = 1;
}

static unsigned char ow_read_bit(void)
{
	return OW_PORT ? 1u : 0u;
}

/* Coarse delays — tune against the demo's Delay10TCYx / Tick if 1-Wire fails. */
static void ow_delay_us(unsigned int us)
{
	unsigned int i;
	for (i = 0; i < us; i++) {
		Delay10TCYx(12);
	}
}

static int ow_reset(void)
{
	unsigned char presence;

	ow_drive_low();
	ow_delay_us(480);
	ow_release();
	ow_delay_us(70);
	presence = !ow_read_bit();
	ow_delay_us(410);
	return presence ? 0 : -1;
}

static void ow_write_bit(unsigned char bit)
{
	if (bit) {
		ow_drive_low();
		ow_delay_us(6);
		ow_release();
		ow_delay_us(64);
	} else {
		ow_drive_low();
		ow_delay_us(60);
		ow_release();
		ow_delay_us(10);
	}
}

static unsigned char ow_read_bit_slot(void)
{
	unsigned char b;

	ow_drive_low();
	ow_delay_us(6);
	ow_release();
	ow_delay_us(9);
	b = ow_read_bit();
	ow_delay_us(55);
	return b;
}

static void ow_write_byte(unsigned char v)
{
	unsigned char i;
	for (i = 0; i < 8u; i++) {
		ow_write_bit(v & 1u);
		v >>= 1;
	}
}

static unsigned char ow_read_byte(void)
{
	unsigned char i;
	unsigned char v = 0;
	for (i = 0; i < 8u; i++) {
		if (ow_read_bit_slot()) {
			v |= (unsigned char)(1u << i);
		}
	}
	return v;
}

static int ds18b20_read_c(float *out_c)
{
	unsigned char lo;
	unsigned char hi;
	short raw;

	if (ow_reset() < 0) {
		return -1;
	}
	ow_write_byte(0xCC);
	ow_write_byte(0x44);
	{
		DWORD start = TickGet();
		while (TickGet() - start < (TICK_SECOND * 1u)) {
			StackTask();
		}
	}
	if (ow_reset() < 0) {
		return -1;
	}
	ow_write_byte(0xCC);
	ow_write_byte(0xBE);
	lo = ow_read_byte();
	hi = ow_read_byte();
	raw = (short)(((unsigned short)hi << 8) | lo);
	*out_c = (float)raw / 16.0f;
	return 0;
}

static int parse_ipv4(const char *s, BYTE out[4])
{
	unsigned v = 0;
	int n = 0;
	const char *p = s;

	while (*p) {
		if (*p >= '0' && *p <= '9') {
			v = v * 10u + (unsigned)(*p - '0');
			if (v > 255u) {
				return -1;
			}
		} else if (*p == '.' && n < 3) {
			out[n++] = (BYTE)v;
			v = 0;
		} else {
			return -1;
		}
		p++;
	}
	if (n != 3) {
		return -1;
	}
	out[3] = (BYTE)v;
	return 0;
}

static int build_http_post(float temp_f)
{
	char body[64];
	int n;

	n = sprintf(body, "{\"temp1\":%.2f}", (double)temp_f);
	if (n < 0 || n >= (int)sizeof(body)) {
		return -1;
	}
	n = sprintf(httpBuf,
		"POST %s HTTP/1.1\r\n"
		"Host: %s\r\n"
		"Content-Type: application/json\r\n"
		"Content-Length: %d\r\n"
		"Connection: close\r\n"
		"\r\n"
		"%s",
		INGEST_PATH, INGEST_HOST, (int)strlen(body), body);
	if (n < 0 || n >= (int)sizeof(httpBuf)) {
		return -1;
	}
	httpLen = (WORD)n;
	httpSent = 0;
	return 0;
}

void ThermalTraceAppInit(void)
{
	OW_TRIS = 1;
	lastPostTick = TickGet() - INTERVAL_TICKS;
	httpSock = INVALID_SOCKET;
	printf("ThermalTrace PIC18F67J60 ingest\r\n");
}

void ThermalTraceAppTask(void)
{
	BYTE remote[4];
	float c;
	float f;
	WORD w;

	if (httpSock == INVALID_SOCKET) {
		if (TickGet() - lastPostTick < INTERVAL_TICKS) {
			return;
		}
		if (!DHCPIsBound() && !AppConfig.Flags.bIsDHCPEnabled) {
			/* Static IP demos still proceed once the link is up. */
		}
		if (ds18b20_read_c(&c) < 0) {
			printf("DS18B20 read failed\r\n");
			lastPostTick = TickGet();
			return;
		}
		f = c * 9.0f / 5.0f + 32.0f;
		if (build_http_post(f) < 0) {
			printf("build fail\r\n");
			lastPostTick = TickGet();
			return;
		}
		if (parse_ipv4(INGEST_HOST, remote) < 0) {
			printf("bad INGEST_HOST\r\n");
			lastPostTick = TickGet();
			return;
		}
		httpSock = TCPOpen(*(DWORD *)remote, TCP_OPEN_IP_ADDRESS, INGEST_PORT,
				   TCP_PURPOSE_DEFAULT);
		if (httpSock == INVALID_SOCKET) {
			printf("TCPOpen fail\r\n");
			lastPostTick = TickGet();
			return;
		}
		return;
	}

	if (!TCPIsConnected(httpSock)) {
		if (TCPWasReset(httpSock)) {
			TCPDisconnect(httpSock);
			httpSock = INVALID_SOCKET;
			lastPostTick = TickGet();
			printf("connect reset\r\n");
		}
		return;
	}

	while (httpSent < httpLen) {
		w = TCPIsPutReady(httpSock);
		if (w == 0) {
			return;
		}
		if (w > (WORD)(httpLen - httpSent)) {
			w = (WORD)(httpLen - httpSent);
		}
		w = TCPPutArray(httpSock, (BYTE *)&httpBuf[httpSent], w);
		httpSent += w;
	}
	TCPFlush(httpSock);

	/* Drain status line for Serial; ignore body. */
	while (TCPIsGetReady(httpSock)) {
		TCPGetArray(httpSock, (BYTE *)httpBuf, sizeof(httpBuf));
	}
	if (!TCPIsConnected(httpSock) || TCPWasReset(httpSock)) {
		printf("POST done (check relay / upstream)\r\n");
		TCPDisconnect(httpSock);
		httpSock = INVALID_SOCKET;
		lastPostTick = TickGet();
	}
}
