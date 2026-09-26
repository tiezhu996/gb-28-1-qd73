import { Types } from 'mongoose';
import { Question } from '../models/Question';
import {
  QuestionType,
  DifficultyLevel,
  IAutoGroupRule,
  IKnowledgeRequirement,
  IAutoGroupShortfall,
} from '../types';

export const questionTypeLabels: Record<QuestionType, string> = {
  single: '单选题',
  multiple: '多选题',
  truefalse: '判断题',
  fill: '填空题',
  essay: '简答题',
};

export const difficultyLabels: Record<DifficultyLevel, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
};

export interface AutoGroupInput {
  subject: string;
  rules: IAutoGroupRule[];
}

export interface PlannedQuestion {
  questionId: Types.ObjectId;
  ruleIndex: number;
  score: number;
}

export interface AutoGroupResult {
  questions: PlannedQuestion[];
  totalScore: number;
}

interface NormalizedRule {
  index: number;
  type?: QuestionType;
  difficulty?: DifficultyLevel;
  count: number;
  scorePerQuestion: number;
  label: string;
  knowledgeRequirements: IKnowledgeRequirement[];
}

interface QuestionDoc {
  _id: Types.ObjectId;
  type: QuestionType;
  difficulty: DifficultyLevel;
  knowledgePoints: string[];
}

const formatRuleLabel = (rule: { type?: QuestionType; difficulty?: DifficultyLevel }) => {
  const typeLabel = rule.type ? questionTypeLabels[rule.type] : '全部题型';
  const difficultyLabel = rule.difficulty ? difficultyLabels[rule.difficulty] : '全部难度';
  return `${typeLabel} / ${difficultyLabel}`;
};

const VALID_TYPES: QuestionType[] = ['single', 'multiple', 'truefalse', 'fill', 'essay'];
const VALID_DIFFICULTIES: DifficultyLevel[] = ['easy', 'medium', 'hard'];

/** 规范化并校验组卷规则，非法输入直接抛出错误 */
export const normalizeRules = (rules: any[]): NormalizedRule[] => {
  if (!Array.isArray(rules) || rules.length === 0) {
    throw new Error('组卷规则不能为空');
  }

  return rules.map((raw, index) => {
    const rule = raw || {};
    const type = rule.type || undefined;
    const difficulty = rule.difficulty || undefined;
    const count = Number(rule.count);
    const scorePerQuestion = Number(rule.scorePerQuestion ?? 2);

    if (type && !VALID_TYPES.includes(type)) {
      throw new Error(`第 ${index + 1} 条规则题型不合法`);
    }
    if (difficulty && !VALID_DIFFICULTIES.includes(difficulty)) {
      throw new Error(`第 ${index + 1} 条规则难度不合法`);
    }
    if (!Number.isInteger(count) || count < 1) {
      throw new Error(`第 ${index + 1} 条规则的抽题数量必须是大于0的整数`);
    }
    if (!Number.isFinite(scorePerQuestion) || scorePerQuestion < 0) {
      throw new Error(`第 ${index + 1} 条规则的每题分值不合法`);
    }

    const knowledgeMap = new Map<string, number>();
    for (const req of rule.knowledgeRequirements || []) {
      const point = String(req?.knowledgePoint || '').trim();
      const minCount = Number(req?.minCount);
      if (!point) {
        throw new Error(`第 ${index + 1} 条规则的必考知识点不能为空`);
      }
      if (!Number.isInteger(minCount) || minCount < 1) {
        throw new Error(`第 ${index + 1} 条规则中必考知识点「${point}」的至少条数必须是大于0的整数`);
      }
      knowledgeMap.set(point, (knowledgeMap.get(point) || 0) + minCount);
    }

    const knowledgeRequirements: IKnowledgeRequirement[] = Array.from(knowledgeMap.entries())
      .map(([knowledgePoint, minCount]) => ({ knowledgePoint, minCount }));

    const totalKpCount = knowledgeRequirements.reduce((sum, k) => sum + k.minCount, 0);
    if (totalKpCount > count) {
      throw new Error(
        `第 ${index + 1} 条规则（${formatRuleLabel({ type, difficulty })}）必考知识点要求合计 ${totalKpCount} 道，超过该规则抽题数量 ${count} 道`,
      );
    }

    return {
      index,
      type,
      difficulty,
      count,
      scorePerQuestion,
      label: formatRuleLabel({ type, difficulty }),
      knowledgeRequirements,
    };
  });
};

const ruleMatch = (q: QuestionDoc, rule: NormalizedRule) =>
  (!rule.type || q.type === rule.type) &&
  (!rule.difficulty || q.difficulty === rule.difficulty);

const describeRulePool = (rule: NormalizedRule) => `「${rule.label}」`;

/**
 * 自动组卷规划：
 * 1. 同一份卷子中同一道题只允许出现一次（全局去重）；
 * 2. 先满足各规则的必考知识点条数（候选越少越优先），再补足普通名额（约束越紧越优先）；
 * 3. 任意条件凑不齐时，收集全部缺口并抛出 AutoGroupError，不会生成试卷。
 */
export const planAutoExam = async (input: AutoGroupInput): Promise<AutoGroupResult> => {
  const rules = normalizeRules(input.rules);

  const pool: QuestionDoc[] = await Question.find(
    { subject: input.subject },
    { type: 1, difficulty: 1, knowledgePoints: 1 },
  );

  const shortfalls: IAutoGroupShortfall[] = [];
  const ruleCandidates = new Map<number, QuestionDoc[]>();

  // 第一阶段：按规则独立检查题库是否足够（不考虑跨规则占用，直接指出绝对缺口）
  for (const rule of rules) {
    const candidates = pool.filter((q) => ruleMatch(q, rule));
    ruleCandidates.set(rule.index, candidates);

    if (candidates.length < rule.count) {
      shortfalls.push({
        kind: 'rule',
        ruleIndex: rule.index,
        ruleLabel: rule.label,
        need: rule.count,
        available: candidates.length,
        short: rule.count - candidates.length,
        message: `${describeRulePool(rule)} 题库仅有 ${candidates.length} 道，需要 ${rule.count} 道，还差 ${rule.count - candidates.length} 道`,
      });
    }

    for (const kp of rule.knowledgeRequirements) {
      const kpCandidates = candidates.filter((q) => q.knowledgePoints.includes(kp.knowledgePoint));
      if (kpCandidates.length < kp.minCount) {
        shortfalls.push({
          kind: 'knowledge',
          ruleIndex: rule.index,
          ruleLabel: rule.label,
          knowledgePoint: kp.knowledgePoint,
          need: kp.minCount,
          available: kpCandidates.length,
          short: kp.minCount - kpCandidates.length,
          message: `${describeRulePool(rule)} 必考知识点「${kp.knowledgePoint}」仅有 ${kpCandidates.length} 道，至少需要 ${kp.minCount} 道，还差 ${kp.minCount - kpCandidates.length} 道`,
        });
      }
    }
  }

  if (shortfalls.length > 0) {
    throw new AutoGroupError(shortfalls);
  }

  // 第二阶段：全局去重分配。必考知识点名额优先（候选越少越稀缺越先抽），
  // 然后按规则约束从紧到松补足普通名额。
  const used = new Set<Types.ObjectId>();
  const pickedByRule = new Map<number, QuestionDoc[]>();
  rules.forEach((rule) => pickedByRule.set(rule.index, []));

  const kpDemands = rules
    .flatMap((rule) =>
      rule.knowledgeRequirements.map((kp) => ({
        rule,
        knowledgePoint: kp.knowledgePoint,
        minCount: kp.minCount,
      })),
    )
    .map((demand) => ({
      ...demand,
      available: (ruleCandidates.get(demand.rule.index) || []).filter(
        (q) => q.knowledgePoints.includes(demand.knowledgePoint),
      ).length,
    }))
    .sort(
      (a, b) =>
        a.available - b.available ||
        Number(!!b.rule.type) - Number(!!a.rule.type) ||
        Number(!!b.rule.difficulty) - Number(!!a.rule.difficulty) ||
        a.rule.index - b.rule.index,
    );

  for (const demand of kpDemands) {
    const candidates = (ruleCandidates.get(demand.rule.index) || []).filter(
      (q) => q.knowledgePoints.includes(demand.knowledgePoint) && !used.has(q._id),
    );
    const take = Math.min(demand.minCount, candidates.length);
    shuffleInPlace(candidates);
    for (let i = 0; i < take; i++) {
      used.add(candidates[i]._id);
      pickedByRule.get(demand.rule.index)!.push(candidates[i]);
    }
    if (take < demand.minCount) {
      const short = demand.minCount - take;
      shortfalls.push({
        kind: 'knowledge',
        ruleIndex: demand.rule.index,
        ruleLabel: demand.rule.label,
        knowledgePoint: demand.knowledgePoint,
        need: demand.minCount,
        available: take,
        short,
        message: `${describeRulePool(demand.rule)} 必考知识点「${demand.knowledgePoint}」去重后只能抽到 ${take} 道（其余题目被其他规则/知识点占用），至少需要 ${demand.minCount} 道，还差 ${short} 道`,
      });
    }
  }

  // 候选越少（约束越紧）的规则越先抽
  const sortedRules = [...rules].sort(
    (a, b) =>
      ruleCandidates.get(a.index)!.length - ruleCandidates.get(b.index)!.length ||
      a.index - b.index,
  );

  for (const rule of sortedRules) {
    const picked = pickedByRule.get(rule.index)!;
    const remaining = rule.count - picked.length;
    if (remaining <= 0) continue;

    const candidates = (ruleCandidates.get(rule.index) || []).filter((q) => !used.has(q._id));
    const take = Math.min(remaining, candidates.length);
    shuffleInPlace(candidates);
    for (let i = 0; i < take; i++) {
      used.add(candidates[i]._id);
      picked.push(candidates[i]);
    }
    if (take < remaining) {
      const short = remaining - take;
      shortfalls.push({
        kind: 'rule',
        ruleIndex: rule.index,
        ruleLabel: rule.label,
        need: rule.count,
        available: picked.length,
        short,
        message: `${describeRulePool(rule)} 去重后只能凑齐 ${picked.length} 道（题目被其他规则占用），需要 ${rule.count} 道，还差 ${short} 道`,
      });
    }
  }

  if (shortfalls.length > 0) {
    throw new AutoGroupError(shortfalls);
  }

  // 按规则输入顺序、规则内先必考后普通的次序输出
  const questions: PlannedQuestion[] = [];
  let totalScore = 0;
  for (const rule of rules) {
    for (const q of pickedByRule.get(rule.index)!) {
      questions.push({
        questionId: q._id,
        ruleIndex: rule.index,
        score: rule.scorePerQuestion,
      });
      totalScore += rule.scorePerQuestion;
    }
  }

  // 双保险：整份卷子里同一道题只能出现一次
  const ids = questions.map((q) => q.questionId.toString());
  if (new Set(ids).size !== ids.length) {
    throw new Error('组卷出现重复题目，请重试');
  }

  return { questions, totalScore };
}

const shuffleInPlace = <T>(array: T[]): void => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
};

export class AutoGroupError extends Error {
  shortfalls: IAutoGroupShortfall[];

  constructor(shortfalls: IAutoGroupShortfall[]) {
    super('组卷条件无法满足');
    this.name = 'AutoGroupError';
    this.shortfalls = shortfalls;
  }
}
