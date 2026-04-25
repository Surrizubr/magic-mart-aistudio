import { Purchases, LOG_LEVEL, CustomerInfo } from '@revenuecat/purchases-capacitor';
import { RevenueCatUI, PAYWALL_RESULT } from '@revenuecat/purchases-capacitor-ui';

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
      const result = await RevenueCatUI.presentPaywall();
      return result.result === PAYWALL_RESULT.PURCHASED || result.result === PAYWALL_RESULT.RESTORED;
    } catch (error) {
      console.error('Error presenting paywall:', error);
      return false;
    }
  }

  static async presentCustomerCenter(): Promise<void> {
    try {
      await this.initialize();
      // Using RevenueCatUI.presentCustomerCenter if available
      if (typeof RevenueCatUI.presentCustomerCenter === 'function') {
        await RevenueCatUI.presentCustomerCenter();
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
