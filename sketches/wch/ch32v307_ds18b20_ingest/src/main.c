/**
 * DS18B20 → ThermalTrace push ingest (WCH CH32V307 RISC-V).
 *
 * Primary board: CH32V307V-EVT-R1 (onboard 10M Ethernet PHY).
 * Not Arduino, not Python, not Zephyr: MounRiver Studio + official EVT
 * ETH/DHCP project. Drop this file over User/main.c.
 *
 * WCHNET has no TLS. Same LAN HTTP→HTTPS relay as Uno + W5100 / STM32 Zephyr.
 *
 * 1. Create a push device. Download this file from Devices (path pre-filled)
 *    or set INGEST_PATH below.
 * 2. Run sketches/relay/push_https_forward.py on a LAN host.
 * 3. Set INGEST_HOST to that machine (dotted IPv4).
 * 4. Open EVT/EXAM/ETH/DHCP in MounRiver, replace User/main.c, build, WCH-Link flash.
 * 5. Serial 115200 → dhcp ok, then POST 200
 *
 * Wiring: DS18B20 VDD 3.3V, GND, data → PB12, 4.7k to 3.3V.
 */

#include "debug.h"
#include "eth_driver.h"
#include "string.h"

#ifndef INGEST_HOST
#define INGEST_HOST "192.168.1.50"
#endif
#ifndef INGEST_PORT
#define INGEST_PORT 8080
#endif
#ifndef INGEST_PATH
#define INGEST_PATH "/api/ingest/YOUR_DEVICE_KEY"
#endif

#define INTERVAL_MS 60000
#define OW_PORT GPIOB
#define OW_PIN GPIO_Pin_12

u8 MACAddr[6];
u8 IPAddr[4] = {0, 0, 0, 0};
u8 GWIPAddr[4] = {0, 0, 0, 0};
u8 IPMask[4] = {0, 0, 0, 0};
u8 DESIP[4] = {192, 168, 1, 50};
u16 desport = INGEST_PORT;
u16 srcport = 40000;

u8 SocketId;
u8 SocketRecvBuf[WCHNET_MAX_SOCKET_NUM][RECE_BUF_LEN];

static volatile u8 dhcp_ready;
static volatile u8 tcp_busy;
static u8 http_buf[320];
static u32 http_len;
static u32 wait_ms;

void WCHNET_HandleGlobalInt(void);

static void mStopIfError(u8 iError)
{
	if (iError == WCHNET_ERR_SUCCESS) {
		return;
	}
	printf("Error: %02X\r\n", (u16)iError);
}

static void net_pump(void)
{
	WCHNET_MainTask();
	if (WCHNET_QueryGlobalInt()) {
		WCHNET_HandleGlobalInt();
	}
}

static void net_delay_ms(u32 ms)
{
	u32 i;
	for (i = 0; i < ms; i++) {
		net_pump();
		Delay_Ms(1);
	}
}

static int parse_ipv4(const char *s, u8 out[4])
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
			out[n++] = (u8)v;
			v = 0;
		} else {
			return -1;
		}
		p++;
	}
	if (n != 3) {
		return -1;
	}
	out[3] = (u8)v;
	return 0;
}

static void ow_low(void)
{
	GPIO_ResetBits(OW_PORT, OW_PIN);
}

static void ow_release(void)
{
	GPIO_SetBits(OW_PORT, OW_PIN);
}

static int ow_level(void)
{
	return GPIO_ReadInputDataBit(OW_PORT, OW_PIN) ? 1 : 0;
}

static void ow_init(void)
{
	GPIO_InitTypeDef cfg = {0};

	RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOB, ENABLE);
	cfg.GPIO_Pin = OW_PIN;
	cfg.GPIO_Mode = GPIO_Mode_Out_OD;
	cfg.GPIO_Speed = GPIO_Speed_50MHz;
	GPIO_Init(OW_PORT, &cfg);
	ow_release();
}

static int ow_reset(void)
{
	int present;

	__disable_irq();
	ow_low();
	Delay_Us(480);
	ow_release();
	Delay_Us(70);
	present = ow_level() == 0;
	Delay_Us(410);
	__enable_irq();
	return present ? 0 : -1;
}

static void ow_write_bit(int bit)
{
	__disable_irq();
	ow_low();
	if (bit) {
		Delay_Us(6);
		ow_release();
		Delay_Us(64);
	} else {
		Delay_Us(60);
		ow_release();
		Delay_Us(10);
	}
	__enable_irq();
}

static int ow_read_bit(void)
{
	int bit;

	__disable_irq();
	ow_low();
	Delay_Us(6);
	ow_release();
	Delay_Us(9);
	bit = ow_level();
	Delay_Us(55);
	__enable_irq();
	return bit;
}

static void ow_write_byte(u8 v)
{
	u8 i;
	for (i = 0; i < 8; i++) {
		ow_write_bit(v & 1);
		v >>= 1;
	}
}

static u8 ow_read_byte(void)
{
	u8 i;
	u8 v = 0;
	for (i = 0; i < 8; i++) {
		if (ow_read_bit()) {
			v |= (u8)(1u << i);
		}
	}
	return v;
}

/* Returns temperature in hundredths of a degree F, or -1 on error. */
static int ds18b20_read_f_hundredths(void)
{
	u8 lsb;
	u8 msb;
	int16_t raw;
	int c_hundredths;

	if (ow_reset() != 0) {
		return -1;
	}
	ow_write_byte(0xCC);
	ow_write_byte(0x44);
	net_delay_ms(750);
	if (ow_reset() != 0) {
		return -1;
	}
	ow_write_byte(0xCC);
	ow_write_byte(0xBE);
	lsb = ow_read_byte();
	msb = ow_read_byte();
	raw = (int16_t)(((u16)msb << 8) | lsb);
	c_hundredths = ((int)raw * 100) / 16;
	return (c_hundredths * 9) / 5 + 3200;
}

static int build_http(int f_hundredths)
{
	char body[48];
	int neg = f_hundredths < 0;
	int absv = neg ? -f_hundredths : f_hundredths;
	int n;

	n = sprintf(body, "{\"temp1\":%s%d.%02d}", neg ? "-" : "", absv / 100, absv % 100);
	if (n <= 0) {
		return -1;
	}
	n = sprintf((char *)http_buf,
		    "POST %s HTTP/1.1\r\n"
		    "Host: %s\r\n"
		    "Content-Type: application/json\r\n"
		    "Content-Length: %d\r\n"
		    "Connection: close\r\n"
		    "\r\n"
		    "%s",
		    INGEST_PATH, INGEST_HOST, n, body);
	if (n <= 0 || n >= (int)sizeof(http_buf)) {
		return -1;
	}
	http_len = (u32)n;
	return 0;
}

static void WCHNET_CreateTcpSocket(void)
{
	u8 i;
	SOCK_INF inf;

	memset((void *)&inf, 0, sizeof(inf));
	memcpy((void *)inf.IPAddr, DESIP, 4);
	inf.DesPort = desport;
	inf.SourPort = srcport++;
	inf.ProtoType = PROTO_TYPE_TCP;
	inf.RecvBufLen = RECE_BUF_LEN;
	i = WCHNET_SocketCreat(&SocketId, &inf);
	printf("SocketId %d\r\n", SocketId);
	mStopIfError(i);
	if (i == WCHNET_ERR_SUCCESS) {
		tcp_busy = 1;
		i = WCHNET_SocketConnect(SocketId);
		mStopIfError(i);
	}
}

static void start_post(void)
{
	int f_hundredths = ds18b20_read_f_hundredths();

	if (f_hundredths < -8000 || f_hundredths > 25000) {
		printf("DS18B20 read failed (check PB12)\r\n");
		return;
	}
	printf("temp1 %d.%02d F\r\n", f_hundredths / 100, (f_hundredths < 0 ? -f_hundredths : f_hundredths) % 100);
	if (build_http(f_hundredths) != 0) {
		printf("http build failed\r\n");
		return;
	}
	WCHNET_CreateTcpSocket();
}

void TIM2_Init(void)
{
	TIM_TimeBaseInitTypeDef TIM_TimeBaseStructure = {0};

	RCC_APB1PeriphClockCmd(RCC_APB1Periph_TIM2, ENABLE);
	TIM_TimeBaseStructure.TIM_Period = SystemCoreClock / 1000000;
	TIM_TimeBaseStructure.TIM_Prescaler = WCHNETTIMERPERIOD * 1000 - 1;
	TIM_TimeBaseStructure.TIM_ClockDivision = 0;
	TIM_TimeBaseStructure.TIM_CounterMode = TIM_CounterMode_Up;
	TIM_TimeBaseInit(TIM2, &TIM_TimeBaseStructure);
	TIM_ITConfig(TIM2, TIM_IT_Update, ENABLE);
	TIM_Cmd(TIM2, ENABLE);
	TIM_ClearITPendingBit(TIM2, TIM_IT_Update);
	NVIC_SetPriority(TIM2_IRQn, 0x80);
	NVIC_EnableIRQ(TIM2_IRQn);
}

void WCHNET_HandleSockInt(u8 socketid, u8 intstat)
{
	u32 len;

	if (intstat & SINT_STAT_CONNECT) {
		WCHNET_ModifyRecvBuf(socketid, (u32)SocketRecvBuf[socketid], RECE_BUF_LEN);
		len = http_len;
		if (WCHNET_SocketSend(socketid, http_buf, &len) == WCHNET_ERR_SUCCESS) {
			printf("POST sent %lu\r\n", (unsigned long)len);
		} else {
			printf("POST send failed\r\n");
			WCHNET_SocketClose(socketid, TCP_CLOSE_NORMAL);
			tcp_busy = 0;
		}
	}
	if (intstat & SINT_STAT_RECV) {
		len = WCHNET_SocketRecvLen(socketid, NULL);
		if (len > sizeof(http_buf) - 1) {
			len = sizeof(http_buf) - 1;
		}
		WCHNET_SocketRecv(socketid, http_buf, &len);
		http_buf[len] = 0;
		if (strstr((char *)http_buf, "200")) {
			printf("POST 200\r\n");
		} else {
			printf("POST %s\r\n", http_buf);
		}
		WCHNET_SocketClose(socketid, TCP_CLOSE_NORMAL);
		tcp_busy = 0;
	}
	if (intstat & (SINT_STAT_DISCONNECT | SINT_STAT_TIM_OUT)) {
		printf(intstat & SINT_STAT_TIM_OUT ? "TCP Timeout\r\n" : "TCP Disconnect\r\n");
		tcp_busy = 0;
	}
}

void WCHNET_HandleGlobalInt(void)
{
	u8 intstat;
	u16 i;
	u8 socketint;

	intstat = WCHNET_GetGlobalInt();
	if (intstat & GINT_STAT_UNREACH) {
		printf("GINT_STAT_UNREACH\r\n");
	}
	if (intstat & GINT_STAT_IP_CONFLI) {
		printf("GINT_STAT_IP_CONFLI\r\n");
	}
	if (intstat & GINT_STAT_PHY_CHANGE) {
		i = WCHNET_GetPHYStatus();
		if (i & PHY_Linked_Status) {
			printf("PHY Link Success\r\n");
		}
	}
	if (intstat & GINT_STAT_SOCKET) {
		for (i = 0; i < WCHNET_MAX_SOCKET_NUM; i++) {
			socketint = WCHNET_GetSocketInt(i);
			if (socketint) {
				WCHNET_HandleSockInt(i, socketint);
			}
		}
	}
}

u8 WCHNET_DHCPCallBack(u8 status, void *arg)
{
	u8 *p;

	if (status) {
		printf("DHCP Fail %02x\r\n", status);
		return NoREADY;
	}
	p = arg;
	memcpy(IPAddr, p, 4);
	memcpy(GWIPAddr, &p[4], 4);
	memcpy(IPMask, &p[8], 4);
	printf("dhcp ok\r\n");
	printf("IPAddr: %d.%d.%d.%d\r\n", IPAddr[0], IPAddr[1], IPAddr[2], IPAddr[3]);
	dhcp_ready = 1;
	return READY;
}

int main(void)
{
	u8 i;

	SystemCoreClockUpdate();
	Delay_Init();
	USART_Printf_Init(115200);
	printf("ThermalTrace CH32V307 DS18B20 ingest\r\n");
	printf("SystemClk:%d\r\n", SystemCoreClock);
	printf("ChipID:%08x\r\n", DBGMCU_GetCHIPID());
	ow_init();

	if (parse_ipv4(INGEST_HOST, DESIP) != 0) {
		printf("bad INGEST_HOST (need dotted IPv4)\r\n");
		while (1) {
		}
	}
	desport = INGEST_PORT;

	WCHNET_GetMacAddr(MACAddr);
	TIM2_Init();
	WCHNET_DHCPSetHostname("thermaltrace");
	i = ETH_LibInit(IPAddr, GWIPAddr, IPMask, MACAddr);
	mStopIfError(i);
	if (i == WCHNET_ERR_SUCCESS) {
		printf("WCHNET_LibInit Success\r\n");
	}
	WCHNET_DHCPStart(WCHNET_DHCPCallBack);

	wait_ms = INTERVAL_MS;
	while (1) {
		net_pump();
		Delay_Ms(1);
		if (!dhcp_ready || tcp_busy) {
			continue;
		}
		if (wait_ms < INTERVAL_MS) {
			wait_ms++;
			continue;
		}
		wait_ms = 0;
		start_post();
	}
}
