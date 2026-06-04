import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import helmet from "helmet"; // إضافة الحماية
import rateLimit from "express-rate-limit"; // إضافة الليمنتر
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// --- تفعيل درع الأمان ---
app.use(helmet()); 
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  message: { error: "لقد تجاوزت الحد المسموح به من الطلبات، يرجى المحاولة لاحقاً." }
});
// -----------------------

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) { return { id: req.id, method: req.method, url: req.url?.split("?")[0] }; },
      res(res) { return { statusCode: res.statusCode }; },
    },
  }),
);

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// تطبيق الحماية على مسار الـ API فقط
app.use("/api", limiter, router);

export default app;

