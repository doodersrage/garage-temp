# GNU AVR assembly ingest for ATmega328P + W5100 (no Arduino C).
MCU      ?= atmega328p
F_CPU    ?= 16000000UL
PORT     ?= /dev/ttyACM0
BAUD     ?= 115200

CC       ?= avr-gcc
OBJCOPY  ?= avr-objcopy
AVRDUDE  ?= avrdude

CFLAGS   = -mmcu=$(MCU) -nostartfiles -nostdlib -DF_CPU=$(F_CPU)

all: ingest.hex

ingest.elf: main.S
	$(CC) $(CFLAGS) -o $@ $<

ingest.hex: ingest.elf
	$(OBJCOPY) -O ihex $< $@

flash: ingest.hex
	$(AVRDUDE) -c arduino -p m328p -P $(PORT) -b $(BAUD) -U flash:w:ingest.hex:i

clean:
	rm -f ingest.elf ingest.hex
