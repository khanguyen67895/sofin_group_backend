const nodemailer = require('nodemailer')

const createTransporter = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

/**
 * @param {{ name: string, email: string, phone: string, position: string, message?: string }} candidate
 * @param {{ originalname: string, buffer: Buffer, mimetype: string } | null} cvFile
 */
const sendCVToHR = async (candidate, cvFile) => {
  const transporter = createTransporter()

  const hrEmail = process.env.HR_EMAIL
  if (!hrEmail) throw new Error('HR_EMAIL is not configured')

  const attachments = cvFile
    ? [{ filename: cvFile.originalname, content: cvFile.buffer, contentType: cvFile.mimetype }]
    : []

  await transporter.sendMail({
    from: `"Sofin Recruitment" <${process.env.SMTP_USER}>`,
    to: hrEmail,
    replyTo: candidate.email,
    subject: `[CV] ${candidate.name}${candidate.position ? ` - ${candidate.position}` : ''}`,
    html: `
      <h2>Ứng viên mới gửi CV</h2>
      <table style="border-collapse:collapse;width:100%">
        <tr><td style="padding:8px;font-weight:bold;width:140px">Họ tên</td><td style="padding:8px">${candidate.name}</td></tr>
        <tr><td style="padding:8px;font-weight:bold">Email</td><td style="padding:8px"><a href="mailto:${candidate.email}">${candidate.email}</a></td></tr>
        <tr><td style="padding:8px;font-weight:bold">Số điện thoại</td><td style="padding:8px">${candidate.phone}</td></tr>
        <tr><td style="padding:8px;font-weight:bold">Vị trí ứng tuyển</td><td style="padding:8px">${candidate.position || 'Không xác định'}</td></tr>
        ${candidate.message ? `<tr><td style="padding:8px;font-weight:bold;vertical-align:top">Lời nhắn</td><td style="padding:8px">${candidate.message}</td></tr>` : ''}
      </table>
      ${cvFile ? '<p><em>CV đính kèm trong file.</em></p>' : '<p><em>Ứng viên không đính kèm file CV.</em></p>'}
      <hr/>
      <p style="color:#888;font-size:12px">Email tự động từ hệ thống tuyển dụng Sofin Group</p>
    `,
    attachments,
  })

  // Confirm email to candidate
  await transporter.sendMail({
    from: `"Sofin Group" <${process.env.SMTP_USER}>`,
    to: candidate.email,
    subject: 'Sofin Group đã nhận được hồ sơ của bạn',
    html: `
      <h2>Xin chào ${candidate.name},</h2>
      <p>Cảm ơn bạn đã quan tâm và ứng tuyển vào vị trí <strong>${candidate.position}</strong> tại Sofin Group.</p>
      <p>Chúng tôi đã nhận được hồ sơ của bạn và sẽ liên hệ lại trong thời gian sớm nhất.</p>
      <br/>
      <p>Trân trọng,<br/><strong>Đội ngũ Tuyển dụng Sofin Group</strong></p>
    `,
  })
}

module.exports = { sendCVToHR }
