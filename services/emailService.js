import axios from 'axios';

const PLUNK_API_KEY = 'sk_e51f4377340231478e78e000ed7fe6fb8ecb51fb4231cdb6';
const PLUNK_API_URL = 'https://api.useplunk.com/v1/send';

export const sendOTP = async (email, subject = "Eventin OTP kod") => {
  try {
    // Email formatı kontrolü
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Yanlış email formatı");
    }

    const otp = Math.floor(100000 + Math.random() * 900000);
    
    const emailData = {
      to: email,
      subject: `${otp} - ${subject}`,
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4f46e5; text-align: center;">Təsdiq kodunuz</h2>
          <h1 style="color: #4f46e5; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
          <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
            Kodu heç kimə verməyin. Əgər siz göndərməmisinizsə, zəhmət olmasa bu emaili nəzərə almayın.
          </p>
        </div>
      `,
      from: 'info@eventin.az',
      reply: 'info@eventin.az',
      name: 'Eventin',
      subscribed: true,
      headers: {}
    };

    const response = await axios.post(PLUNK_API_URL, emailData, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${PLUNK_API_KEY}`
      }
    });

    if (response.status !== 200) {
      throw new Error("Email gönderme başarısız oldu");
    }

    return otp;
  } catch (error) {
   
    
    if (error.response) {
     
      throw new Error("Email gönderme servisi şu anda kullanılamıyor");
    } else if (error.request) {
      // İstek yapıldı ama yanıt alınamadı
      throw new Error("Sunucuya bağlanılamıyor");
    } else {
      // İstek oluşturulurken hata oluştu
      throw new Error("Email gönderme işlemi başlatılamadı");
    }
  }
}; 