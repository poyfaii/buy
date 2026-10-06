// config.js — ตั้งค่าการเชื่อมต่อ Google Sheets
// 1) ทำตาม "คู่มือติดตั้ง" แล้วนำ URL ของเว็บแอป (ลงท้ายด้วย /exec) มาวางระหว่างเครื่องหมาย ' ' ด้านล่าง
// 2) ถ้าปล่อยว่าง เว็บจะทำงานแบบทดลอง เก็บข้อมูลในเบราว์เซอร์นี้เท่านั้น (ลูกค้าเครื่องอื่นจะไม่เห็นสินค้าที่แก้)
const API_URL='https://script.google.com/macros/s/AKfycbw3Mc7RAa7KKKFASfAyOs-rTBzE25cL_3v20wZzH-52VlOdBePjUlVc_K4wTYBzv8o/exec';

// ใช้เฉพาะโหมดทดลอง (API_URL ว่าง) — เมื่อเชื่อม Google Sheets แล้ว รหัสแอดมินจริงอยู่ใน Code.gs
// หลังเชื่อมแล้วให้ลบสองบรรทัดนี้ทิ้งได้
const LOCAL_ADMIN_USER='admin',LOCAL_ADMIN_PASS='1234';
