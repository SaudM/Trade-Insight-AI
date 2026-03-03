// src/lib/tracking.ts

/**
 * 集中管理所有的 GA4 埋点事件名称及其参数类型
 * 确保各处的发送符合定义好的 schema
 */

// Event Name Typings
export type TrackingEventName =
    // User & Global
    | 'login'
    | 'sign_up'
    | 'view_landing_page'
    | 'click_cta'
    | 'scroll_depth'
    // Signal & Core
    | 'filter_signal_date'
    | 'sort_signal_table'
    | 'view_stock_detail'
    | 'view_research_report'
    | 'hover_hot_board'
    | 'hover_trade_record'
    // Payment Funnel
    | 'view_pricing_page'
    | 'click_subscribe'
    | 'create_payment_order'
    | 'payment_cancelled'
    | 'payment_error'
    | 'payment_success'
    // User Growth & Referral
    | 'a2hs_prompt_show'
    | 'a2hs_install_click'
    | 'a2hs_dismiss'
    | 'share_research_report'
    | 'download_research_pdf';

// Interface per Event Name parameters mapping
export interface TrackingEventParams {
    login: { method: string };
    sign_up: { method: string };
    view_landing_page: { source?: string };
    click_cta: { button_name: string; target_url?: string };
    scroll_depth: { depth_percent: number };

    filter_signal_date: { selected_date: string; is_latest: boolean };
    sort_signal_table: { sort_field: string; sort_direction: string };
    view_stock_detail: { symbol: string; stock_name: string; signal_type: string };
    view_research_report: { symbol: string };
    hover_hot_board: { board_name: string; board_score: number };
    hover_trade_record: { record_type: 'entry' | 'exit'; symbol: string; pnl_pct?: number };

    view_pricing_page: { source?: string };
    click_subscribe: { plan_id: string; price: number; is_popular: boolean };
    create_payment_order: { plan_id: string; trade_type: string; out_trade_no: string };
    payment_cancelled: { plan_id: string; reason: string };
    payment_error: { plan_id: string; error_message: string; error_type: string };
    payment_success: { plan_id: string; price: number; currency: string };

    a2hs_prompt_show: { platform: 'ios' | 'android' };
    a2hs_install_click: { platform: 'ios' | 'android' };
    a2hs_dismiss: { platform: 'ios' | 'android' };
    share_research_report: { symbol: string; report_title: string; share_method: 'native_share' | 'copy_link' };
    download_research_pdf: { symbol: string; report_title: string };
}

// User properties definition
export interface TrackingUserProperties {
    user_id?: string;
    subscription_status?: string;
    register_date?: string;
    is_trial_user?: boolean;
}

declare global {
    interface Window {
        gtag?: (...args: any[]) => void;
    }
}

/**
 * Track an event to GA4 via the global gtag function.
 */
export function trackEvent<T extends TrackingEventName>(
    eventName: T,
    params?: TrackingEventParams[T]
) {
    if (typeof window === 'undefined' || !window.gtag) {
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[Tracking Mock] Event: ${eventName}`, params);
        }
        return;
    }

    // GA recommends flat parameter objects
    window.gtag('event', eventName, params as any);
}

/**
 * Set user properties in GA4. Usually called on login or when fetching user context.
 */
export function setTrackingUser(properties: TrackingUserProperties) {
    if (typeof window === 'undefined' || !window.gtag) {
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[Tracking Mock] UserProperties: `, properties);
        }
        return;
    }

    window.gtag('set', 'user_properties', properties);
}
