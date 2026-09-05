/**
 * DS18B20 → ThermalTrace push ingest (Zephyr C / STM32).
 *
 * Primary board: ST Nucleo-F767ZI (onboard Ethernet MAC + PHY).
 * Not Arduino IDE, not Python: west + Zephyr SDK, ST-LINK flash.
 *
 * The W5100 Uno path cannot TLS. This sample is the same topology with a
 * Cortex-M7: HTTP POST to a LAN HTTPS relay, then thermaltrace.dev.
 *
 * 1. Create a push device. Download this file from Devices (path pre-filled)
 *    or set INGEST_PATH below.
 * 2. Run sketches/relay/push_https_forward.py on a LAN host.
 * 3. Set INGEST_HOST to that machine.
 * 4. west build -b nucleo_f767zi sketches/zephyr/ds18b20_ingest
 * 5. west flash; Serial 115200 → dhcp ok, then POST 200
 *
 * Wiring: DS18B20 VDD 3.3V, GND, data → Arduino D4 (PF14), 4.7k to 3.3V.
 */

#include <zephyr/kernel.h>
#include <zephyr/device.h>
#include <zephyr/drivers/sensor.h>
#include <zephyr/net/http/client.h>
#include <zephyr/net/net_if.h>
#include <zephyr/net/net_ip.h>
#include <zephyr/net/socket.h>
#include <zephyr/net/dhcpv4.h>

#include <errno.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>

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
#define RECV_BUF_SIZE 512

static uint8_t recv_buf[RECV_BUF_SIZE];

static int wait_for_ipv4(struct net_if *iface)
{
	net_dhcpv4_start(iface);
	for (int i = 0; i < 45; i++) {
		if (net_if_ipv4_get_global_addr(iface, NET_ADDR_PREFERRED) != NULL) {
			printk("dhcp ok\n");
			return 0;
		}
		k_sleep(K_MSEC(1000));
	}
	printk("dhcp timeout\n");
	return -ETIMEDOUT;
}

static void http_response_cb(struct http_response *rsp,
			     enum http_final_call final_data,
			     void *user_data)
{
	ARG_UNUSED(user_data);

	if (final_data != HTTP_DATA_FINAL) {
		return;
	}
	printk("POST %s\n", rsp->http_status != NULL ? rsp->http_status : "?");
}

static int post_temp_f(float temp_f)
{
	static const char *headers[] = {
		"Content-Type: application/json\r\n",
		NULL,
	};
	char body[96];
	struct sockaddr_in addr;
	struct http_request req;
	int sock;
	int ret;

	snprintk(body, sizeof(body), "{\"temp1\":%.2f}", (double)temp_f);

	memset(&addr, 0, sizeof(addr));
	addr.sin_family = AF_INET;
	addr.sin_port = htons(INGEST_PORT);
	if (inet_pton(AF_INET, INGEST_HOST, &addr.sin_addr) != 1) {
		printk("bad INGEST_HOST\n");
		return -EINVAL;
	}

	sock = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
	if (sock < 0) {
		printk("socket %d\n", errno);
		return -errno;
	}

	ret = connect(sock, (struct sockaddr *)&addr, sizeof(addr));
	if (ret < 0) {
		printk("connect %d\n", errno);
		close(sock);
		return -errno;
	}

	memset(&req, 0, sizeof(req));
	req.method = HTTP_POST;
	req.url = INGEST_PATH;
	req.host = INGEST_HOST;
	req.protocol = "HTTP/1.1";
	req.payload = body;
	req.payload_len = strlen(body);
	req.header_fields = headers;
	req.response = http_response_cb;
	req.recv_buf = recv_buf;
	req.recv_buf_len = sizeof(recv_buf);

	ret = http_client_req(sock, &req, 8 * MSEC_PER_SEC, NULL);
	close(sock);
	if (ret < 0) {
		printk("http %d\n", ret);
		return ret;
	}
	return 0;
}

int main(void)
{
	const struct device *ds = DEVICE_DT_GET_ANY(maxim_ds18b20);
	struct net_if *iface = net_if_get_default();
	struct sensor_value val;

	if (ds == NULL || !device_is_ready(ds)) {
		printk("DS18B20 not ready (check D4 / PF14 wiring)\n");
		return 0;
	}
	if (iface == NULL) {
		printk("no network interface\n");
		return 0;
	}

	if (wait_for_ipv4(iface) < 0) {
		return 0;
	}

	while (1) {
		if (sensor_sample_fetch(ds) == 0 &&
		    sensor_channel_get(ds, SENSOR_CHAN_AMBIENT_TEMP, &val) == 0) {
			double c = sensor_value_to_double(&val);
			float f = (float)(c * 9.0 / 5.0 + 32.0);

			printk("temp1 %.2f F\n", (double)f);
			post_temp_f(f);
		} else {
			printk("DS18B20 read failed\n");
		}
		k_sleep(K_MSEC(INTERVAL_MS));
	}
}
