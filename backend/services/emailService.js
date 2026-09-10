const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || 'Arogya Raksha <onboarding@resend.dev>';

// ─── Shared HTML helpers ──────────────────────────────────────────────

const baseStyles = `
  body { margin:0; padding:0; background:#f0fdf4; font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif; }
  .container { max-width:600px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.06); }
  .header { background:linear-gradient(135deg,#059669 0%,#10b981 50%,#34d399 100%); padding:40px 32px; text-align:center; }
  .header img { width:48px; height:48px; margin-bottom:12px; }
  .header h1 { margin:0; color:#ffffff; font-size:28px; font-weight:800; letter-spacing:-0.5px; }
  .header p { margin:8px 0 0; color:rgba(255,255,255,0.85); font-size:14px; }
  .body { padding:32px; }
  .greeting { font-size:20px; font-weight:700; color:#111827; margin:0 0 8px; }
  .subtitle { font-size:15px; color:#6b7280; margin:0 0 24px; line-height:1.6; }
  .card { background:#f9fafb; border:1px solid #e5e7eb; border-radius:12px; padding:20px; margin-bottom:20px; }
  .card-title { font-size:13px; font-weight:700; color:#059669; text-transform:uppercase; letter-spacing:0.5px; margin:0 0 12px; }
  .row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f3f4f6; }
  .row:last-child { border-bottom:none; }
  .row-label { font-size:13px; color:#6b7280; font-weight:500; }
  .row-value { font-size:13px; color:#111827; font-weight:600; }
  .badge { display:inline-block; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:700; }
  .badge-green { background:#d1fae5; color:#065f46; }
  .badge-blue { background:#dbeafe; color:#1e40af; }
  .badge-amber { background:#fef3c7; color:#92400e; }
  .cta-btn { display:inline-block; padding:14px 32px; background:linear-gradient(135deg,#059669,#10b981); color:#ffffff !important; text-decoration:none; border-radius:10px; font-weight:700; font-size:15px; margin:8px 0 24px; }
  .divider { border:none; border-top:1px solid #e5e7eb; margin:24px 0; }
  .footer { padding:24px 32px; text-align:center; background:#f9fafb; border-top:1px solid #e5e7eb; }
  .footer p { margin:4px 0; font-size:12px; color:#9ca3af; }
  .footer a { color:#059669; text-decoration:none; font-weight:600; }
  table { width:100%; border-collapse:collapse; }
  .item-row td { padding:10px 0; border-bottom:1px solid #f3f4f6; font-size:13px; }
  .item-name { color:#111827; font-weight:600; }
  .item-qty { color:#6b7280; text-align:center; }
  .item-price { color:#111827; font-weight:600; text-align:right; }
  .total-row td { padding:12px 0; font-size:16px; font-weight:800; color:#059669; border-top:2px solid #059669; }
`;

function wrapHtml(title, bodyContent) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div style="padding:24px;">
    <div class="container">
      ${bodyContent}
      <div class="footer">
        <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}">Arogya Raksha</a> — Intelligent Healthcare Platform</p>
        <p>This is an automated message. Please do not reply to this email.</p>
        <p style="margin-top:8px;">© ${new Date().getFullYear()} Arogya Raksha. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ─── Email Templates ──────────────────────────────────────────────────

/**
 * Send a welcome email after successful registration.
 */
async function sendWelcomeEmail({ to, name, role }) {
  const roleLabel = role === 'doctor' ? '🩺 Doctor' : role === 'admin' ? '🏥 Hospital Admin' : '🧑 Patient';

  const html = wrapHtml('Welcome to Arogya Raksha', `
    <div class="header">
      <h1>🏥 Arogya Raksha</h1>
      <p>Your Health, Our Priority</p>
    </div>
    <div class="body">
      <p class="greeting">Welcome aboard, ${name}! 🎉</p>
      <p class="subtitle">Your account has been successfully created on Arogya Raksha — India's intelligent healthcare platform. You're all set to explore our AI-powered health tools.</p>

      <div class="card">
        <p class="card-title">Account Details</p>
        <div style="margin-bottom:8px;"><span class="row-label">Name:</span> <span class="row-value">${name}</span></div>
        <div style="margin-bottom:8px;"><span class="row-label">Email:</span> <span class="row-value">${to}</span></div>
        <div><span class="row-label">Role:</span> <span class="badge badge-green">${roleLabel}</span></div>
      </div>

      <div class="card">
        <p class="card-title">What you can do</p>
        <div style="margin-bottom:6px;">✅ AI-Powered Symptom Checker</div>
        <div style="margin-bottom:6px;">✅ Book Doctor Appointments</div>
        <div style="margin-bottom:6px;">✅ Medicine Scanner & Ordering</div>
        <div>✅ Health Reports & Analytics</div>
      </div>

      <div style="text-align:center;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" class="cta-btn">Go to Dashboard →</a>
      </div>
    </div>
  `);

  return sendEmail({ to, subject: `Welcome to Arogya Raksha, ${name}! 🏥`, html });
}

/**
 * Send an order confirmation email.
 */
async function sendOrderConfirmationEmail({ to, name, order }) {
  const items = order.items || [];
  const itemRows = items.map(item => `
    <tr class="item-row">
      <td class="item-name">${item.name || 'Medicine'}</td>
      <td class="item-qty">${item.quantity || 1}</td>
      <td class="item-price">₹${(item.price || 0).toFixed(2)}</td>
    </tr>
  `).join('');

  const address = order.shipping_address || order.shippingAddress || {};
  const addressStr = [address.street, address.city, address.state, address.pincode].filter(Boolean).join(', ') || 'Not provided';

  const html = wrapHtml('Order Confirmation', `
    <div class="header">
      <h1>📦 Order Confirmed!</h1>
      <p>Order #${order.id ? order.id.slice(0, 8).toUpperCase() : 'N/A'}</p>
    </div>
    <div class="body">
      <p class="greeting">Hi ${name},</p>
      <p class="subtitle">Great news! Your order has been placed successfully. We'll get your medicines ready for delivery right away.</p>

      <div class="card">
        <p class="card-title">Order Summary</p>
        <table>
          <thead>
            <tr style="border-bottom:2px solid #e5e7eb;">
              <td style="padding:8px 0; font-size:12px; font-weight:700; color:#6b7280; text-transform:uppercase;">Item</td>
              <td style="padding:8px 0; font-size:12px; font-weight:700; color:#6b7280; text-transform:uppercase; text-align:center;">Qty</td>
              <td style="padding:8px 0; font-size:12px; font-weight:700; color:#6b7280; text-transform:uppercase; text-align:right;">Price</td>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
            <tr class="total-row">
              <td colspan="2">Total</td>
              <td style="text-align:right;">₹${(order.total_amount || order.totalAmount || 0).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="card">
        <p class="card-title">Delivery Details</p>
        <div style="margin-bottom:8px;"><span class="row-label">Type:</span> <span class="badge badge-blue">${(order.order_type || order.orderType || 'Medicine').toUpperCase()}</span></div>
        <div style="margin-bottom:8px;"><span class="row-label">Address:</span> <span class="row-value">${addressStr}</span></div>
        <div><span class="row-label">Status:</span> <span class="badge badge-amber">Processing</span></div>
      </div>

      ${order.notes ? `<div class="card"><p class="card-title">Notes</p><p style="font-size:13px;color:#374151;margin:0;">${order.notes}</p></div>` : ''}

      <div style="text-align:center;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/orders" class="cta-btn">Track Your Order →</a>
      </div>
    </div>
  `);

  return sendEmail({ to, subject: `Order Confirmed! #${order.id ? order.id.slice(0, 8).toUpperCase() : ''} 📦`, html });
}

/**
 * Send an appointment confirmation email.
 */
async function sendAppointmentConfirmationEmail({ to, name, appointment, doctorName, hospitalName }) {
  const apptDate = appointment.date ? new Date(appointment.date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'TBD';
  const timeSlot = appointment.time_slot || appointment.timeSlot || {};
  const timeStr = timeSlot.start ? `${timeSlot.start} - ${timeSlot.end || ''}` : (typeof timeSlot === 'string' ? timeSlot : 'To be confirmed');

  const html = wrapHtml('Appointment Confirmed', `
    <div class="header">
      <h1>📅 Appointment Booked!</h1>
      <p>Your doctor is expecting you</p>
    </div>
    <div class="body">
      <p class="greeting">Hi ${name},</p>
      <p class="subtitle">Your appointment has been successfully booked. Please arrive 10 minutes before your scheduled time.</p>

      <div class="card">
        <p class="card-title">Appointment Details</p>
        <div style="margin-bottom:10px;"><span class="row-label">📅 Date:</span> <span class="row-value">${apptDate}</span></div>
        <div style="margin-bottom:10px;"><span class="row-label">🕐 Time:</span> <span class="row-value">${timeStr}</span></div>
        <div style="margin-bottom:10px;"><span class="row-label">🩺 Doctor:</span> <span class="row-value">${doctorName || 'Assigned Doctor'}</span></div>
        ${hospitalName ? `<div style="margin-bottom:10px;"><span class="row-label">🏥 Hospital:</span> <span class="row-value">${hospitalName}</span></div>` : ''}
        <div style="margin-bottom:10px;"><span class="row-label">🏷️ Department:</span> <span class="badge badge-blue">${appointment.department || 'General'}</span></div>
        ${appointment.reason ? `<div><span class="row-label">📝 Reason:</span> <span class="row-value">${appointment.reason}</span></div>` : ''}
      </div>

      <div class="card" style="background:#fffbeb; border-color:#fde68a;">
        <p class="card-title" style="color:#b45309;">⚠️ Important Reminders</p>
        <div style="font-size:13px; color:#92400e; line-height:1.7;">
          • Please carry a valid photo ID<br>
          • Bring any previous medical reports<br>
          • Arrive 10 minutes before your slot<br>
          • Wear a mask for your safety
        </div>
      </div>

      <div style="text-align:center;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/appointments" class="cta-btn">View Appointment →</a>
      </div>
    </div>
  `);

  return sendEmail({ to, subject: `Appointment Confirmed for ${apptDate} 📅`, html });
}

// ─── Core send function ───────────────────────────────────────────────

async function sendEmail({ to, subject, html }) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error('📧 Resend error:', error);
      return { success: false, error };
    }

    console.log(`📧 Email sent to ${to}: ${subject} (id: ${data?.id})`);
    return { success: true, id: data?.id };
  } catch (err) {
    console.error('📧 Email send failed:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  sendWelcomeEmail,
  sendOrderConfirmationEmail,
  sendAppointmentConfirmationEmail,
  sendEmail,
};
