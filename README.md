# ตีแบต — เว็บแอป LINE LIFF

หน้าเว็บ static (index.html, app.js, style.css, config.js) ต่อกับ Supabase โปรเจกต์ "Tibat" (qqkojyrumvsjkyxinmqw)
ฐานข้อมูล ฟังก์ชัน และ Edge Functions (line-auth, verify-slip) อยู่ใน Supabase — ดูได้ที่ Database > Migrations และ Edge Functions

## เปิดใช้
1. เปิด GitHub Pages ของ repo นี้ (Settings > Pages > Deploy from branch > main / root)
2. LINE Developers: สร้าง LINE Login channel + LIFF app (Endpoint URL = ที่อยู่ GitHub Pages, scope: openid, profile)
3. ในแอป โหมดแอดมิน > ตั้งค่า: ใส่ LIFF ID, Channel ID, พร้อมเพย์ของตีแบต
4. Supabase > Edge Functions > Secrets: SLIPOK_API_KEY, SLIPOK_BRANCH_ID (และ RESEND_API_KEY, EMAIL_FROM ถ้าต้องการส่งอีเมล)
5. ก่อนเปิดจริง ตั้ง slip_test_mode = false และ allow_guest_login = false
