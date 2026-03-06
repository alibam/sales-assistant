/**
 * Customer Demo Client Component
 * 
 * 使用 shadcn/ui 组件重构 - Vercel/Linear 极简风格
 */
'use client';

import React, { useState, useTransition } from 'react';
import { useStreamableValue } from 'ai/rsc';
import { generateStrategyStream } from '@/lib/ai/strategy-server';
import type { CustomerProfile } from '@/lib/ai/types';
import type { ClassificationResult } from '@/lib/xstate/state-evaluator';
import { resetCustomerProfile, handleFollowUp } from './actions';
import { TEST_CUSTOMER_IDS } from '@/lib/db/fixtures';
import type { ProfileGap } from '@/lib/ai/types';

// shadcn/ui 组件
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

interface SeedCustomer {
  name: string;
  profile: CustomerProfile;
  classification: ClassificationResult;
}

interface Props {
  customer: SeedCustomer;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function CustomerDemoClient({ customer }: Props) {
  const [followUpText, setFollowUpText] = useState('');
  const [isPending, startTransition] = useTransition();
  const [isResetting, setIsResetting] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [streamableValue, setStreamableValue] = useState<any>(undefined);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, error] = useStreamableValue<any>(streamableValue);

  // 当前客户画像状态（修复数据陈旧 Bug）
  const [currentProfile, setCurrentProfile] = useState<CustomerProfile>(customer.profile);

  // Dual-track state - 不允许修改！
  const [isPostCallMode, setIsPostCallMode] = useState(false);
  const [completionRate, setCompletionRate] = useState(0);
  const [missingFields, setMissingFields] = useState<ProfileGap[]>([]);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [isFollowUpMode, setIsFollowUpMode] = useState(true);

  function handleGenerate() {
    // 只在跟进模式下检查输入是否为空
    if (isFollowUpMode && !followUpText.trim()) return;

    startTransition(async () => {
      try {
        if (isFollowUpMode) {
          const result = await handleFollowUp(
            TEST_CUSTOMER_IDS.ZHANG_WEI,
            followUpText,
            isPostCallMode ? 'postCall' : 'copilot',
          );

          setCompletionRate(result.completionRate);
          setMissingFields(result.missingFields);
          setConversationHistory((prev) => [
            ...prev,
            { role: 'user', content: followUpText },
            { role: 'assistant', content: result.aiResponse },
          ]);

          // 更新本地画像状态（修复数据陈旧 Bug）
          if (result.updatedProfile) {
            setCurrentProfile(result.updatedProfile);
          }

          setFollowUpText('');

          if (result.completionRate >= 80) {
            setIsFollowUpMode(false);
          }
        } else {
          const stream = await generateStrategyStream(
            currentProfile,
            customer.classification.status,
            customer.classification,
            TEST_CUSTOMER_IDS.ZHANG_WEI,
            currentProfile,
            customer.name,
            followUpText,
          );
          setStreamableValue(stream);
        }
      } catch (err) {
        console.error('生成失败:', err);
      }
    });
  }

  async function handleReset() {
    if (!confirm('确定要重置此客户的画像数据吗？此操作不可撤销！')) {
      return;
    }

    setIsResetting(true);
    try {
      const result = await resetCustomerProfile(TEST_CUSTOMER_IDS.ZHANG_WEI);
      if (result.success) {
        alert('✅ 客户画像已重置');
        window.location.reload();
      } else {
        alert(`❌ 重置失败: ${result.error}`);
      }
    } catch (err) {
      console.error('重置失败:', err);
      alert('❌ 重置失败');
    } finally {
      setIsResetting(false);
    }
  }

  const showSkeleton = isPending && !data;

  // Badge variant based on customer status
  const statusVariant = customer.classification.status === 'A' ? 'default' :
    customer.classification.status === 'B' ? 'secondary' :
      customer.classification.status === 'C' ? 'outline' : 'destructive';

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <h1 className="text-3xl font-semibold text-slate-900 mb-2">
          客户演示 - {customer.name}
        </h1>
        <p className="text-slate-500">双轨画像采集与 AI 策略生成</p>
      </div>

      {/* 黄金分栏布局 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {/* 左侧主轴 (2/3) */}
        <div className="xl:col-span-2 space-y-6">
        
        {/* 客户画像全景档案 - 8大维度完整映射 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>客户全景档案</CardTitle>
              <Badge variant={statusVariant}>
                {customer.classification.status} 级客户
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* ① 需求与场景 */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <span>🎯</span> ① 需求与场景
                </h3>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-500">用车场景</span>
                    <p className="font-medium text-slate-900 mt-1">
                      {currentProfile.scene?.usage_scenario || <Badge variant="outline" className="text-xs">待采集</Badge>}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">关键动机</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {currentProfile.scene?.key_motives && currentProfile.scene.key_motives.length > 0 ? (
                        currentProfile.scene.key_motives.map((m, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{m}</Badge>
                        ))
                      ) : (
                        <Badge variant="outline" className="text-xs">待采集</Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">必须项</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {currentProfile.scene?.must_haves && currentProfile.scene.must_haves.length > 0 ? (
                        currentProfile.scene.must_haves.map((m, i) => (
                          <Badge key={i} variant="destructive" className="text-xs">{m}</Badge>
                        ))
                      ) : (
                        <Badge variant="outline" className="text-xs">待采集</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ② 车型与偏好 */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <span>🚗</span> ② 车型与偏好
                </h3>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-500">意向车型</span>
                    <p className="font-medium text-slate-900 mt-1">
                      {currentProfile.preference?.intent_model || <Badge variant="outline" className="text-xs">待采集</Badge>}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">配置偏好</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {currentProfile.preference?.config_preference && currentProfile.preference.config_preference.length > 0 ? (
                        currentProfile.preference.config_preference.map((c, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{c}</Badge>
                        ))
                      ) : (
                        <Badge variant="outline" className="text-xs">待采集</Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">颜色偏好</span>
                    <p className="font-medium text-slate-900 mt-1">
                      {currentProfile.preference?.color_and_inventory || <Badge variant="outline" className="text-xs">待采集</Badge>}
                    </p>
                  </div>
                </div>
              </div>

              {/* ③ 预算与付款 */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <span>💰</span> ③ 预算与付款
                </h3>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-500">预算上限</span>
                    <p className="font-medium text-slate-900 mt-1">
                      {currentProfile.budget_payment?.budget_limit || <Badge variant="outline" className="text-xs">待采集</Badge>}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">付款方式</span>
                    <p className="font-medium text-slate-900 mt-1">
                      {currentProfile.budget_payment?.payment_method || <Badge variant="outline" className="text-xs">待采集</Badge>}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">价格敏感度</span>
                    <p className="font-medium text-slate-900 mt-1">
                      {currentProfile.budget_payment?.price_sensitivity || <Badge variant="outline" className="text-xs">待采集</Badge>}
                    </p>
                  </div>
                </div>
              </div>

              {/* ④ 时间窗口 */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <span>⏰</span> ④ 时间窗口
                </h3>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-500">提车时间</span>
                    <p className="font-medium text-slate-900 mt-1">
                      {currentProfile.timing?.delivery_timeline || <Badge variant="outline" className="text-xs">待采集</Badge>}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">触发事件</span>
                    <p className="font-medium text-slate-900 mt-1">
                      {currentProfile.timing?.trigger_event || <Badge variant="outline" className="text-xs">待采集</Badge>}
                    </p>
                  </div>
                </div>
              </div>

              {/* ⑤ 决策单元 */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <span>👥</span> ⑤ 决策单元
                </h3>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-500">决策人参与</span>
                    <p className="font-medium text-slate-900 mt-1">
                      {currentProfile.decision_unit?.decision_maker_involved !== undefined ? (
                        currentProfile.decision_unit.decision_maker_involved ? '✅ 已参与' : '❌ 未参与'
                      ) : (
                        <Badge variant="outline" className="text-xs">待采集</Badge>
                      )}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">实际出钱人</span>
                    <p className="font-medium text-slate-900 mt-1">
                      {currentProfile.decision_unit?.payer || <Badge variant="outline" className="text-xs">待采集</Badge>}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">需家人到店</span>
                    <p className="font-medium text-slate-900 mt-1">
                      {currentProfile.decision_unit?.family_visit_required !== undefined ? (
                        currentProfile.decision_unit.family_visit_required ? '需要' : '不需要'
                      ) : (
                        <Badge variant="outline" className="text-xs">待采集</Badge>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* ⑥ 竞品与对比 */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <span>⚔️</span> ⑥ 竞品与对比
                </h3>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-500">竞品车型</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {currentProfile.competitor?.competing_models && currentProfile.competitor.competing_models.length > 0 ? (
                        currentProfile.competitor.competing_models.map((c, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{c}</Badge>
                        ))
                      ) : (
                        <Badge variant="outline" className="text-xs">待采集</Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">已拿竞品报价</span>
                    <p className="font-medium text-slate-900 mt-1">
                      {currentProfile.competitor?.has_quote !== undefined ? (
                        currentProfile.competitor.has_quote ? '是' : '否'
                      ) : (
                        <Badge variant="outline" className="text-xs">待采集</Badge>
                      )}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">主要纠结点</span>
                    <p className="font-medium text-slate-900 mt-1">
                      {currentProfile.competitor?.main_conflict || <Badge variant="outline" className="text-xs">待采集</Badge>}
                    </p>
                  </div>
                </div>
              </div>

              {/* ⑦ 交易要素 */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <span>📋</span> ⑦ 交易要素
                </h3>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-500">置换情况</span>
                    <p className="font-medium text-slate-900 mt-1">
                      {currentProfile.deal_factors?.trade_in_info || <Badge variant="outline" className="text-xs">待采集</Badge>}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">金融情况</span>
                    <p className="font-medium text-slate-900 mt-1">
                      {currentProfile.deal_factors?.finance_info || <Badge variant="outline" className="text-xs">待采集</Badge>}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">交车接受度</span>
                    <p className="font-medium text-slate-900 mt-1">
                      {currentProfile.deal_factors?.delivery_acceptance || <Badge variant="outline" className="text-xs">待采集</Badge>}
                    </p>
                  </div>
                </div>
              </div>

              {/* ⑧ 风险与阻塞 */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <span>⚠️</span> ⑧ 风险与阻塞
                </h3>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-500">最大卡点</span>
                    <p className="font-medium text-slate-900 mt-1">
                      {currentProfile.blockers?.main_blocker || <Badge variant="outline" className="text-xs">待采集</Badge>}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">卡点强度</span>
                    <p className="font-medium text-slate-900 mt-1">
                      {currentProfile.blockers?.intensity || <Badge variant="outline" className="text-xs">待采集</Badge>}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">需经理介入</span>
                    <p className="font-medium text-slate-900 mt-1">
                      {currentProfile.blockers?.needs_manager !== undefined ? (
                        currentProfile.blockers.needs_manager ? '需要' : '不需要'
                      ) : (
                        <Badge variant="outline" className="text-xs">待采集</Badge>
                      )}
                    </p>
                  </div>
                </div>
              </div>

            </div>
            
            <Separator className="my-4" />
            
            {/* 分类原因 */}
            <div className="text-xs text-slate-600">
              <span className="font-medium">分类原因：</span>{customer.classification.reason}
            </div>
          </CardContent>
        </Card>

        {/* Progress Bar - shadcn Progress - 始终可见 */}
        <Card>
          <CardHeader>
            <CardTitle>画像完成度</CardTitle>
          </CardHeader>
          <CardContent>
              <Progress value={completionRate} className="mb-2" />
              <div className="flex justify-between text-sm text-slate-500">
                <span>0%</span>
                <span className="font-medium">{completionRate}%</span>
                <span>100%</span>
              </div>

              {missingFields.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">待补充字段（前3项）</p>
                  <div className="flex flex-wrap gap-2">
                    {missingFields.slice(0, 3).map((field, idx) => (
                      <Badge 
                        key={idx} 
                        variant={
                          field.priority === 'critical' ? 'destructive' : 
                          field.priority === 'high' ? 'secondary' : 'outline'
                        }
                      >
                        {field.sectionTitle} → {field.description}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
        {/* 左侧主轴结束 */}

        {/* 右侧边栏 (1/3) */}
        <div className="xl:col-span-1 flex flex-col gap-6">

        {/* 跟进记录输入区 - shadcn Card */}
        <Card>
          <CardHeader>
            <CardTitle>{isFollowUpMode ? '跟进记录' : 'AI 策略生成'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isFollowUpMode && (
              <div className="flex items-center gap-3">
                <Checkbox 
                  id="postCallMode" 
                  checked={isPostCallMode}
                  onCheckedChange={(checked) => setIsPostCallMode(checked as boolean)}
                />
                <label htmlFor="postCallMode" className="text-sm">
                  {isPostCallMode ? '💬 事后复盘模式' : '🎯 实时引导模式'}
                </label>
                <span className="text-xs text-slate-400">
                  {isPostCallMode ? 'AI 会追问您补全画像' : 'AI 会生成给客户的话术'}
                </span>
              </div>
            )}

            <Textarea
              placeholder={
                isFollowUpMode
                  ? isPostCallMode
                    ? '请输入通话录音总结或客户信息...'
                    : '请输入客户说了什么...'
                  : '请输入跟进记录...'
              }
              value={followUpText}
              onChange={(e) => setFollowUpText(e.target.value)}
              className="min-h-[120px]"
            />

            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={handleGenerate} 
                disabled={isPending || (isFollowUpMode && !followUpText.trim())}
              >
                {isPending ? '处理中...' : isFollowUpMode ? '提交跟进' : '生成 AI 策略'}
              </Button>

              {!isFollowUpMode && (
                <Button 
                  variant="outline"
                  onClick={() => setIsFollowUpMode(true)}
                >
                  返回跟进模式
                </Button>
              )}

              <Button 
                variant="destructive" 
                onClick={handleReset}
                disabled={isResetting}
              >
                {isResetting ? '重置中...' : '重置此客户画像'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Conversation History - shadcn Card - 始终可见 */}
        {conversationHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>对话历史</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[500px] overflow-y-auto">
              <div className="space-y-4">
                {conversationHistory.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <Avatar className={msg.role === 'user' ? 'bg-slate-900' : 'bg-slate-100'}>
                        <AvatarFallback className={msg.role === 'user' ? 'text-white' : ''}>
                          {msg.role === 'user' ? '👤' : '🤖'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className={`px-4 py-2 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-900'
                      }`}>
                        <p className="text-sm">{msg.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 骨架屏 */}
        {showSkeleton && (
          <Card>
            <CardContent className="pt-6">
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-slate-200 rounded w-2/5" />
                <div className="h-4 bg-slate-200 rounded w-full" />
                <div className="h-4 bg-slate-200 rounded w-11/12" />
                <div className="h-4 bg-slate-200 rounded w-9/12" />
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* 流式生成区 - shadcn Card */}
        {data && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>AI 策略建议</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const text = JSON.stringify(data, null, 2);
                    navigator.clipboard.writeText(text);
                  }}
                >
                  📋 复制
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {data.summary && (
                <div className="p-4 bg-slate-50 rounded-lg">
                  <h3 className="font-medium mb-2">📊 {data.title || '策略摘要'}</h3>
                  <p className="text-sm text-slate-600">{data.summary}</p>
                </div>
              )}
            
              {data.talkTracks && data.talkTracks.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3">💬 话术建议</h3>
                  <div className="space-y-3">
                    {data.talkTracks.map((track: any, idx: number) => (
                      <div key={idx} className="p-4 border rounded-lg">
                        <p className="font-medium mb-2">{track.objective}</p>
                        <p className="text-sm text-slate-600 italic mb-2">"{track.script}"</p>
                        <div className="flex gap-4 text-xs text-slate-400">
                          <span>💡 {track.tone}</span>
                          <span>⏰ {track.whenToUse}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            
              {data.actionPlan && data.actionPlan.length > 0 && (
                <div>
                  <h3 className="font-medium mb-3">📋 行动计划</h3>
                  <div className="space-y-2">
                    {data.actionPlan.map((action: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg">
                        <Checkbox />
                        <div>
                          <p className="text-sm font-medium">{action.step}</p>
                          <p className="text-xs text-slate-400">👤 {action.owner} · 📅 {action.dueWindow}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            
              {data.nextFollowUp && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium">📅 下次跟进建议: {data.nextFollowUp}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-sm text-red-600">⚠️ 生成失败: {String(error)}</p>
            </CardContent>
          </Card>
        )}

        </div>
        {/* 右侧边栏结束 */}

      </div>
      {/* 黄金分栏布局结束 */}
    </div>
  );
}
