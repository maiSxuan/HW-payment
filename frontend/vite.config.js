import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 3000,
    strictPort: true, // Không tự động nhảy sang 3001 nếu 3000 bị chiếm
    proxy: {
      "/zalopay": "http://localhost:3001",
      "/vnpay": "http://localhost:3001",
      "/payment-status": "http://localhost:3001",
      "/orderstatus": "http://localhost:3001",
      "/payment": "http://localhost:3001",
    },
  },
});
