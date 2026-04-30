import { Purchases, LOG_LEVEL, CustomerInfo } from '@revenuecat/purchases-capacitor';
import { RevenueCatUI, PAYWALL_RESULT } from '@revenuecat/purchases-capacitor-ui';

import { Capacitor } from '@capacitor/core';

const REVENUECAT_API_KEY_WEB = import.meta.env.VITE_REVENUECAT_PUBLIC_KEY_WEB || 'goog_your_key_here';
const REVENUECAT_API_KEY_IOS = import.meta.env.VITE_REVENUECAT_PUBLIC_KEY_IOS || 'goog_your_key_here';
const REVENUECAT_API_KEY_ANDROID = import.meta.env.VITE_REVENUECAT_PUBLIC_KEY_ANDROID || 'goog_your_key_here';

const ENTITLEMENT_ID = 'IDAPPS Premium';

export class RevenueCatService {
  private static initialized = false;

  static async initialize() {
    if (this.initialized) return;

    try {
      if (!Capacitor.isPluginAvailable('Purchases')) {
        console.warn('RevenueCat Purchases plugin not available');
        return;
      }

      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
      
      let apiKey = REVENUECAT_API_KEY_WEB;
      
      if (Capacitor.getPlatform() === 'android') {
        apiKey = REVENUECAT_API_KEY_ANDROID;
      } else if (Capacitor.getPlatform() === 'ios') {
        apiKey = REVENUECAT_API_KEY_IOS;
      }
      
      console.log('Configuring RevenueCat with platform:', Capacitor.getPlatform());
      
      await Purchases.configure({
        apiKey: apiKey,
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
      // On web/simulator, the plugin might not be available
      if (typeof RevenueCatUI.presentPaywall !== 'function') {
        console.warn('RevenueCat Paywall is only available on native platforms.');
        return false;
      }
      const result = await RevenueCatUI.presentPaywall();
      return result.result === PAYWALL_RESULT.PURCHASED || result.result === PAYWALL_RESULT.RESTORED;
    } catch (error: any) {
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
