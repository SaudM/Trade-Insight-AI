"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Database } from "lucide-react";
import { useToast } from '@/hooks/use-toast';

interface DatabaseErrorFallbackProps {
  /** 错误信息 */
  error: string;
  /** 重试函数 */
  onRetry: () => Promise<void>;
  /** 是否显示详细错误信息 */
  showDetails?: boolean;
}

/**
 * 数据库连接错误回退组件
 * 当PostgreSQL连接失败时显示，提供优雅的错误提示和重试功能
 * 
 * @component
 * @param {DatabaseErrorFallbackProps} props - 组件属性
 * @returns {JSX.Element} 数据库错误回退界面
 */
export function DatabaseErrorFallback({ 
  error, 
  onRetry, 
  showDetails = false 
}: DatabaseErrorFallbackProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const { toast } = useToast();

  /**
   * 处理重试操作
   */
  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await onRetry();
      toast({
        title: "重试成功",
        description: "数据库连接已恢复",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "重试失败",
        description: "数据库连接仍然存在问题，请稍后再试",
      });
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
            <Database className="h-6 w-6 text-orange-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            数据库连接异常
          </CardTitle>
          <CardDescription className="text-gray-600">
            系统暂时无法连接到数据库，请稍后重试
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="flex items-start space-x-3 rounded-lg bg-orange-50 p-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-orange-800">
              <p className="font-medium">服务暂时不可用</p>
              <p className="mt-1">
                为确保数据一致性，系统需要稳定的数据库连接。请检查网络连接后重试。
              </p>
            </div>
          </div>

          {showDetails && error && (
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-700 mb-1">错误详情：</p>
              <p className="text-xs text-gray-600 font-mono break-all">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            <Button 
              onClick={handleRetry}
              disabled={isRetrying}
              className="w-full"
              size="lg"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  重试中...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  重试连接
                </>
              )}
            </Button>
            
            <div className="text-center">
              <p className="text-xs text-gray-500">
                如果问题持续存在，请联系技术支持
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}