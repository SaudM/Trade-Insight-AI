/**
 * Firebase Admin SDK配置
 * 用于服务端操作，如API路由中的数据库写入
 */

import { initializeApp, getApps, cert, App, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { firebaseConfig } from '@/firebase/config';

let adminApp: App | null = null;
let adminFirestore: Firestore | null = null;

/**
 * 初始化Firebase Admin SDK
 * @returns Firebase Admin应用实例和Firestore实例
 */
export function initializeFirebaseAdmin() {
  // 如果已经初始化，直接返回
  if (adminApp && adminFirestore) {
    return { adminApp, adminFirestore };
  }

  try {
    // 检查是否已有Admin应用实例
    const existingApps = getApps();
    if (existingApps.length > 0) {
      adminApp = existingApps[0];
    } else {
        const projectId = firebaseConfig?.projectId || process.env.GCLOUD_PROJECT;
        try {
            // 在生产环境中（如Firebase App Hosting, Cloud Run），这会利用环境自动提供的凭据
            adminApp = initializeApp({
                credential: applicationDefault(),
                projectId: projectId,
            });
        } catch (e) {
            console.warn("Admin SDK default initialization failed, likely in local dev. Falling back. Error:", e);
            // 本地开发回退方案：如果默认凭证失败，仅使用projectId初始化。
            // 这在本地可能功能受限，但可以避免应用崩溃。
            // 确保本地运行 `firebase login` 或 `gcloud auth application-default login`
            if (projectId) {
                 adminApp = initializeApp({ projectId });
            } else {
                throw new Error("Failed to initialize Firebase Admin: Project ID is missing.");
            }
        }
    }

    // 获取 Firestore 实例，并为 Admin SDK 操作覆盖安全规则的 auth 变量
    adminFirestore = getFirestore(adminApp, {
      databaseAuthVariableOverride: null, // 明确 Admin SDK 的 auth 对象为 null
    });
    
    return { adminApp, adminFirestore };
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    throw new Error('Firebase Admin SDK initialization failed');
  }
}

/**
 * 获取Admin Firestore实例
 * @returns Firestore实例
 */
export function getAdminFirestore(): Firestore {
  if (!adminFirestore) {
    const { adminFirestore: firestore } = initializeFirebaseAdmin();
    return firestore;
  }
  return adminFirestore;
}
