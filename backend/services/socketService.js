const Chat = require('../models/Chat');
const User = require('../models/User');

module.exports = function (io) {
  const onlineUsers = new Map();

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('user_online', (userId) => {
      onlineUsers.set(userId, socket.id);
      io.emit('online_users', Array.from(onlineUsers.keys()));
    });

    socket.on('join_chat', (chatId) => {
      socket.join(chatId);
    });

    socket.on('send_message', async (data) => {
      try {
        const { chatId, senderId, content, type, fileUrl } = data;

        const message = await Chat.addMessage({
          chatId,
          senderId,
          content,
          type: type || 'text',
          fileUrl,
        });

        // Get sender info for the emitted message
        const sender = await User.findById(senderId);

        io.to(chatId).emit('new_message', {
          ...message,
          sender: sender ? { id: sender.id, name: sender.name, avatar: sender.avatar } : null,
        });
      } catch (error) {
        console.error('Socket message error:', error);
      }
    });

    socket.on('typing', (data) => {
      socket.to(data.chatId).emit('user_typing', data);
    });

    socket.on('stop_typing', (data) => {
      socket.to(data.chatId).emit('user_stop_typing', data);
    });

    // ── Crisis Coordination Rooms ──
    socket.on('join_incident', (incidentId) => {
      socket.join(`incident_${incidentId}`);
      console.log(`Socket ${socket.id} joined incident room: incident_${incidentId}`);
    });

    socket.on('leave_incident', (incidentId) => {
      socket.leave(`incident_${incidentId}`);
    });

    // Responder joins their personal alert channel
    socket.on('responder_online', (responderId) => {
      socket.join(`responder_${responderId}`);
      console.log(`Responder ${responderId} online`);
    });

    // Hospital portal: hospital staff join to receive incoming patient alerts
    socket.on('hospital_join', (hospitalId) => {
      socket.join('hospital_portal');
      socket.join(`hospital_${hospitalId}`);
      console.log(`Hospital ${hospitalId} joined portal`);
    });

    // Crisis chat message via socket (real-time relay)
    // Use socket.to() (not io.to()) to exclude sender → prevents double messages
    socket.on('crisis_message', (data) => {
      const { incidentId, sender, senderRole, text } = data;
      const message = {
        id: `MSG${Date.now()}`,
        sender,
        senderRole,
        text,
        timestamp: new Date().toISOString(),
      };
      socket.to(`incident_${incidentId}`).emit('incident_message', message);
    });

    // Responder accepts / updates status
    socket.on('crisis_status_update', (data) => {
      io.emit('incident_status_update', data);
    });

    // Responder advances incident status via socket (so guest page updates in real-time)
    socket.on('responder_status_advance', async (data) => {
      const { incidentId, status, responderId } = data;
      try {
        // Import on-demand to avoid circular deps — call the same logic as POST /api/crisis/status/:id
        const fetch = globalThis.fetch || require('node-fetch');
        const port = process.env.PORT || 5000;
        await fetch(`http://localhost:${port}/api/crisis/status/${incidentId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
      } catch (e) {
        console.warn('Socket status advance failed:', e.message);
      }
    });

    // WebRTC signaling
    socket.on('call_user', (data) => {
      const targetSocket = onlineUsers.get(data.targetId);
      if (targetSocket) {
        io.to(targetSocket).emit('incoming_call', {
          from: data.from,
          signal: data.signal,
          callType: data.callType,
        });
      }
    });

    socket.on('answer_call', (data) => {
      io.to(data.to).emit('call_accepted', data.signal);
    });

    socket.on('end_call', (data) => {
      const targetSocket = onlineUsers.get(data.targetId);
      if (targetSocket) {
        io.to(targetSocket).emit('call_ended');
      }
    });

    // ── 4-Panel Real-Time Communication Channels ──

    // 1. Role-based room subscriptions
    socket.on('join_role_room', (role) => {
      if (['patient', 'asha', 'doctor', 'ambulance', 'hospital_admin', 'pharmacy'].includes(role)) {
        socket.join(`role:${role}`);
        console.log(`Socket ${socket.id} joined role room: role:${role}`);
      }
    });

    // ── Healthcare Journey Pipeline Events (End-to-End Tracking) ──
    socket.on('create_healthcare_journey', (journey) => {
      console.log(`🏥 New Healthcare Journey Started: ${journey.id} (Token #${journey.tokenNumber})`);
      io.emit('journey_created', journey);
      // Notify Doctor and Hospital Admin
      io.to('role:doctor').to('role:hospital_admin').emit('cross_panel_toast', {
        id: `toast-${Date.now()}`,
        type: 'info',
        title: 'New Patient Booked',
        message: `${journey.patientName} booked Token #${journey.tokenNumber} for ${journey.doctorName} (${journey.hospitalName})`,
      });
    });

    socket.on('update_journey_step', (data) => {
      // data: { journeyId, step, statusNotes, updatedBy, extraData }
      console.log(`📍 Journey ${data.journeyId} advanced to step: ${data.step}`);
      io.emit('journey_updated', data);
    });

    // Digital Prescription Stream (Doctor -> Pharmacy & Patient)
    socket.on('create_digital_prescription', (prescriptionData) => {
      console.log(`📄 Digital Prescription Issued: ${prescriptionData.id} for ${prescriptionData.patientName}`);
      io.emit('prescription_issued', prescriptionData);
      io.to('role:pharmacy').emit('cross_panel_toast', {
        id: `toast-${Date.now()}`,
        type: 'success',
        title: 'New Digital Prescription Received',
        message: `Dr. ${prescriptionData.doctorName} issued Rx for ${prescriptionData.patientName}. Ready for dispensing.`,
      });
    });

    // Pharmacy Dispense / Pack Update
    socket.on('update_pharmacy_status', (dispenseData) => {
      console.log(`💊 Pharmacy Update: ${dispenseData.prescriptionId} -> ${dispenseData.status}`);
      io.emit('pharmacy_status_updated', dispenseData);
    });

    // 2. Ambulance Live GPS Tracking (EMR-2026-XXXX)
    socket.on('ambulance_location_update', (data) => {
      // Data: { dispatchId, lat, lng, speed, eta, status, vehicleNo, driverName, patientName, locationName }
      io.emit('ambulance_location_stream', data);
      socket.to('role:patient').to('role:doctor').to('role:asha').emit('responder_location', {
        incidentId: data.dispatchId,
        lat: data.lat,
        lng: data.lng,
        eta: data.eta,
        status: data.status,
      });
    });

    // 3. Emergency SOS Broadcast (EMR-2026-XXXX)
    socket.on('trigger_emergency_sos', (sosData) => {
      // Data: { dispatchId, patientName, village, location, message, priority, timestamp }
      console.log(`🚨 Live Emergency SOS: ${sosData.dispatchId} from ${sosData.patientName}`);
      io.emit('emergency_sos_alert', sosData);
    });

    // 4. ASHA Field Issue Tickets (TCK-2026-XXXX)
    socket.on('create_asha_ticket', (ticket) => {
      console.log(`🎫 New ASHA Ticket Created: ${ticket.id}`);
      io.emit('ticket_created', ticket);
    });

    socket.on('update_asha_ticket', (ticket) => {
      console.log(`🎫 ASHA Ticket Updated: ${ticket.id} -> ${ticket.status}`);
      io.emit('ticket_updated', ticket);
    });

    // 5. Healthcare E-Commerce Order Tracking (ORD-2026-XXXX)
    socket.on('update_order_status', (orderData) => {
      console.log(`📦 Order Updated: ${orderData.id} -> ${orderData.status}`);
      io.emit('order_updated', orderData);
    });

    // 6. Cross-panel Notification Toast Trigger
    socket.on('send_cross_panel_toast', (notification) => {
      // notification: { targetRole, title, message, type, id }
      if (notification.targetRole) {
        io.to(`role:${notification.targetRole}`).emit('cross_panel_toast', notification);
      } else {
        io.emit('cross_panel_toast', notification);
      }
    });

    socket.on('disconnect', () => {
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);
          break;
        }
      }
      io.emit('online_users', Array.from(onlineUsers.keys()));
    });
  });
};
