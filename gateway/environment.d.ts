declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT: string;
      AUTH_SERVICE_URL: string;
      DELIVERY_SERVICE_URL: string;
      ORDER_SERVICE_URL: string;
      RESTAURANTS_SERVICE_URL: string;
    }
  }
}

export {};
