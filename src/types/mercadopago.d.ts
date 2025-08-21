declare module 'mercadopago' {
  export class MercadoPagoConfig {
    constructor(options: any);
  }
  export class Preference {
    constructor(config: any);
    create(options: any): Promise<any>;
  }
}
