/*
 * RETRO GAME ARDUINO JOYSTICK CONTROLLER
 * Modul: KY-023 Dual Axis Analog Joystick
 * 
 * Skema Rangkaian Pin:
 * KY-023 GND  --> Arduino GND
 * KY-023 +5V  --> Arduino 5V
 * KY-023 VRx  --> Arduino Pin A0 (Analog Sumbu X)
 * KY-023 VRy  --> Arduino Pin A1 (Analog Sumbu Y)
 * KY-023 SW   --> Arduino Pin D2 (Digital Pushbutton)
 *
 * Baud Rate: 115200 bps
 */

const int PIN_VRX = A0; // Pin Analog VRx (Sumbu X)
const int PIN_VRY = A1; // Pin Analog VRy (Sumbu Y)
const int PIN_SW  = 2;  // Pin Digital SW (Tombol tekan joystick)

void setup() {
  // Inisialisasi komunikasi serial dengan baud rate 115200
  Serial.begin(115200);

  // SW menggunakan internal pullup resistor (ketika ditekan akan bernilai LOW/0)
  pinMode(PIN_SW, INPUT_PULLUP);
}

void loop() {
  // Baca nilai analog joystick (rentang 0 - 1023, posisi tengah ~512)
  int rawX = analogRead(PIN_VRX);
  int rawY = analogRead(PIN_VRY);

  // Baca tombol: dengan INPUT_PULLUP, LOW = ditekan (1), HIGH = dilepas (0)
  int buttonPressed = (digitalRead(PIN_SW) == LOW) ? 1 : 0;

  // Kirim data dalam format JSON yang ringkas dan mudah diparsing oleh browser
  Serial.print("{\"x\":");
  Serial.print(rawX);
  Serial.print(",\"y\":");
  Serial.print(rawY);
  Serial.print(",\"btn\":");
  Serial.print(buttonPressed);
  Serial.println("}");

  // Delay 16ms (~60 kali per detik, sesuai refresh rate layar 60Hz)
  delay(16);
}
