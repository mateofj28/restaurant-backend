// server.js
// import express from "express";
// import mongoose from "mongoose";
// import cors from "cors";

// const app = express();
// app.use(cors());
// app.use(express.json());

// mongoose.connect("mongodb://localhost:27017/restaurante");

// // --- Esquema de la orden ---
// const OrderSchema = new mongoose.Schema({
//   table: Number,
//   peopleCount: Number,
//   orderType: { type: String, enum: ["mesa", "domicilio", "recoger"], required: true },
//   clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: false },
//   products: [
//     {
//       name: String,
//       quantity: Number,
//       details: [
//         {
//           status: String,
//           message: String,
//         },
//       ],
//     },
//   ],
//   totalIPs: Number,
//   total: Number,
// }, { timestamps: true });

// const Order = mongoose.model("Order", OrderSchema);

// // --- Rutas básicas ---
// // 1️⃣ Listar todas las órdenes
// app.get("/orders", async (req, res) => {
//   const orders = await Order.find().populate("clientId");
//   res.json(orders);
// });

// // 2️⃣ Actualizar una orden (por ejemplo cambiar estado de un producto)
// app.put("/orders/:id", async (req, res) => {
//   const updated = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
//   res.json(updated);
// });

// // Servidor
// app.listen(3000, () => console.log("🚀 Backend listo en http://localhost:3000"));
