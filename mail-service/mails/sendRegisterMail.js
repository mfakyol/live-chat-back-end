
import transporter from '../transporter'

export default function(email, activationCode){

const mailOptions = {
    from: 'senderEmail',
    to: email,
    subject: 'Ossis Aktivasyon Kodu',
    text: `Aktivasyon Kodu: ${activationCode}`,
  };

  transporter.sendMail(mailOptions).then(info => console.log('Sent a register e-mail.'));
}