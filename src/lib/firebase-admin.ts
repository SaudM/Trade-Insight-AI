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
      // 在生产环境中，Firebase会自动提供服务账户凭据
      // 在开发环境中，可以通过环境变量或服务账户密钥文件进行配置
      const projectId =
        process.env.FIREBASE_PROJECT_ID ||
        process.env.GOOGLE_CLOUD_PROJECT ||
        process.env.GCLOUD_PROJECT ||
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
        firebaseConfig?.projectId ||
        undefined;

      if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        // 使用服务账户密钥
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        adminApp = initializeApp({
          credential: cert(serviceAccount),
          // 显式传入 projectId，避免本地或非托管环境下无法检测到 Project Id
          projectId: (serviceAccount.project_id as string | undefined) || projectId,
        });
      } else {
        // 使用默认凭据（在Firebase托管环境中自动可用）。为本地环境显式设置 projectId。
        adminApp = initializeApp({
          credential: applicationDefault(),
          projectId,
        });
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
