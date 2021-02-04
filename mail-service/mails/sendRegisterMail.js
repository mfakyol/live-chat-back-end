
import transporter from '../transporter'

export default function(email, activationCode){

const mailOptions = {
    from: 'Live Chat',
    to: email,
    subject: 'Activation Code',
    text: `Activation Code: ${activationCode}`,
  };

  //transporter.sendMail(mailOptions).then(info => console.log('Sent a register e-mail.'));
}