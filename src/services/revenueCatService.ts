import { Purchases, LOG_LEVEL, CustomerInfo } from '@revenuecat/purchases-capacitor';
import { PurchasesPaywall } from '@revenuecat/purchases-capacitor-ui';

const REVENUECAT_API_KEY = 'test_TFGrjJJFMQtcxougEBZrhOnbdjf';
const ENTITLEMENT_ID = 'IDAPPS Premium';

export class RevenueCatService {
  private static initialized = false;

  static async initialize() {
    if (this.initialized) return;

    try {
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
      await Purchases.configure({
        apiKey: REVENUECAT_API_KEY,
      });
      this.initialized = true;
      console.log('RevenueCat initialized successfully');
    } catch (error) {
      console.error('Failed to initialize RevenueCat:', error);
    }
  }

  static async getCustomerInfo(): Promise<CustomerInfo> {
    await this.initialize();
    return await Purchases.getCustomerInfo();
  }

  static async isPremium(): Promise<boolean> {
    try {
      const customerInfo = await this.getCustomerInfo();
      return typeof customerInfo.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
    } catch (error) {
      console.error('Error checking premium status:', error);
      return false;
    }
  }

  static async presentPaywall(): Promise<boolean> {
    try {
      await this.initialize();
      const result = await PurchasesPaywall.present();
      return result.result === 'PURCHASED' || result.result === 'RESTORED';
    } catch (error) {
      console.error('Error presenting paywall:', error);
      return false;
    }
  }

  static async presentCustomerCenter(): Promise<void> {
    try {
      await this.initialize();
      // Since @revenuecat/purchases-capacitor-ui might not have CustomerCenter yet in all versions, 
      // we check for its availability or use a standard portal if not available.
      // For standard Capacitor implementation, managing subscriptions is usually handled via the store's native UI.
      // However, we'll try to use the RevenueCat Customer Center if the SDK supports it.
      // @ts-expect-error - CustomerCenter might be new
      if (PurchasesPaywall.presentCustomerCenter) {
        // @ts-expect-error - method call on new SDK component
        await PurchasesPaywall.presentCustomerCenter();
      } else {
        console.warn('Customer Center not available in this SDK version');
      }
    } catch (error) {
      console.error('Error presenting customer center:', error);
    }
  }

  static async restorePurchases(): Promise<CustomerInfo> {
    await this.initialize();
    return await Purchases.restorePurchases();
  }

  static async logIn(userId: string): Promise<CustomerInfo> {
    await this.initialize();
    const result = await Purchases.logIn({ appUserID: userId });
    return result.customerInfo;
  }

  static async logOut(): Promise<CustomerInfo> {
    await this.initialize();
    return await Purchases.logOut();
  }
}
