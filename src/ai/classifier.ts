import type { TabInfo, TabGroup, GroupType, GroupColor } from '../shared/types';
import { GROUP_TYPE_COLORS } from '../shared/types';

// ==================== Keyword-based Classification Rules ====================

interface ClassificationRule {
  type: GroupType;
  keywords: string[];
  domains: string[];
}

const CLASSIFICATION_RULES: ClassificationRule[] = [
  {
    type: 'development',
    keywords: ['github', 'gitlab', 'stackoverflow', 'code', 'npm', 'yarn', 'webpack', 'vite', 'react', 'vue', 'angular', 'python', 'typescript', 'javascript', 'debug', 'terminal', 'api', 'docker', 'kubernetes', 'deploy', 'ci/cd', 'lint', 'compiler', 'ide', 'vscode', 'jetbrains'],
    domains: ['github.com', 'gitlab.com', 'stackoverflow.com', 'developer.mozilla.org', 'npmjs.com', 'docs.rs', 'crates.io', 'pypi.org', 'jestjs.io', 'vitejs.dev', 'react.dev', 'vuejs.org'],
  },
  {
    type: 'documentation',
    keywords: ['docs', 'documentation', 'wiki', 'readme', 'guide', 'tutorial', 'reference', 'manual', 'specification', 'api docs', 'handbook'],
    domains: ['docs.google.com', 'notion.so', 'confluence.atlassian.com', 'readthedocs.io', 'docsify', 'docusaurus'],
  },
  {
    type: 'research',
    keywords: ['research', 'paper', 'study', 'analysis', 'academic', 'arxiv', 'scholar', 'thesis', 'journal', 'learn', 'course', 'lecture', 'education', 'university'],
    domains: ['scholar.google.com', 'arxiv.org', 'researchgate.net', 'academia.edu', 'coursera.org', 'udemy.com', 'edx.org', 'khanacademy.org', 'wikipedia.org'],
  },
  {
    type: 'shopping',
    keywords: ['buy', 'shop', 'cart', 'price', 'order', 'deal', 'discount', 'product', 'amazon', 'ebay', 'store', 'checkout', 'wishlist', 'compare'],
    domains: ['amazon.com', 'amazon.eg', 'ebay.com', 'aliexpress.com', 'shopify.com', 'etsy.com', 'walmart.com', 'noon.com', 'jumia.com', 'souq.com'],
  },
  {
    type: 'social',
    keywords: ['twitter', 'facebook', 'instagram', 'linkedin', 'reddit', 'tiktok', 'snapchat', 'whatsapp', 'telegram', 'discord', 'slack', 'mastodon', 'post', 'feed', 'timeline', 'message'],
    domains: ['twitter.com', 'x.com', 'facebook.com', 'instagram.com', 'linkedin.com', 'reddit.com', 'tiktok.com', 'discord.com', 'slack.com', 'web.telegram.org', 'web.whatsapp.com'],
  },
  {
    type: 'news',
    keywords: ['news', 'breaking', 'headline', 'article', 'report', 'press', 'media', 'journal', 'bbc', 'cnn', 'aljazeera', 'newspaper', 'update', 'latest'],
    domains: ['news.google.com', 'bbc.com', 'cnn.com', 'aljazeera.net', 'reuters.com', 'nytimes.com', 'theguardian.com', 'techcrunch.com', 'theverge.com'],
  },
  {
    type: 'entertainment',
    keywords: ['youtube', 'netflix', 'spotify', 'twitch', 'game', 'movie', 'music', 'video', 'podcast', 'stream', 'anime', 'manga', 'fun', 'meme', 'comic'],
    domains: ['youtube.com', 'netflix.com', 'spotify.com', 'twitch.tv', 'crunchyroll.com', 'funimation.com', 'soundcloud.com', 'vimeo.com', 'dailymotion.com'],
  },
  {
    type: 'communication',
    keywords: ['email', 'mail', 'inbox', 'calendar', 'meeting', 'zoom', 'hangout', 'meet', 'call', 'video call', 'conference', 'schedule', 'appointment'],
    domains: ['mail.google.com', 'outlook.live.com', 'calendar.google.com', 'zoom.us', 'meet.google.com', 'teams.microsoft.com'],
  },
  {
    type: 'work',
    keywords: ['jira', 'trello', 'asana', 'monday', 'clickup', 'project', 'task', 'sprint', 'kanban', 'board', 'backlog', 'milestone', 'client', 'invoice', 'proposal', 'contract'],
    domains: ['trello.com', 'jira.atlassian.com', 'asana.com', 'monday.com', 'clickup.com', 'linear.app', 'basecamp.com'],
  },
];

// ==================== Local Classifier ====================

function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function classifyTab(tab: TabInfo): GroupType {
  const title = (tab.title || '').toLowerCase();
  const url = (tab.url || '').toLowerCase();
  const domain = extractDomain(tab.url || '');
  const content = (tab.contentSnippet || '').toLowerCase();
  const combined = `${title} ${url} ${content}`;

  let bestMatch: GroupType = 'other';
  let bestScore = 0;

  for (const rule of CLASSIFICATION_RULES) {
    let score = 0;

    // Check domain match (high confidence)
    for (const d of rule.domains) {
      if (domain === d || domain.endsWith(`.${d}`)) {
        score += 10;
      }
    }

    // Check keyword match
    for (const keyword of rule.keywords) {
      if (combined.includes(keyword)) {
        score += 2;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = rule.type;
    }
  }

  return bestMatch;
}

// ==================== AI (Anthropic) Classifier ====================

interface AIClassificationResult {
  type: GroupType;
  groupName: string;
  confidence: number;
}

async function classifyWithAI(
  tabs: TabInfo[],
  apiKey: string
): Promise<Map<number, AIClassificationResult>> {
  const results = new Map<number, AIClassificationResult>();

  if (!apiKey || tabs.length === 0) return results;

  const BATCH_SIZE = 20;

  for (let i = 0; i < tabs.length; i += BATCH_SIZE) {
    const batch = tabs.slice(i, i + BATCH_SIZE);

    const tabSummaries = batch.map(t => ({
      id: t.id,
      title: t.title,
      url: t.url,
      snippet: (t.contentSnippet || '').substring(0, 200),
    }));

    const prompt = `Classify these browser tabs into groups. For each tab, provide:
- type: one of [work, research, shopping, social, entertainment, news, development, documentation, communication, other]
- groupName: a short descriptive name for the group (max 3 words)
- confidence: 0.0 to 1.0

Respond ONLY with a JSON array of objects with id, type, groupName, confidence.

Tabs to classify:
${JSON.stringify(tabSummaries, null, 2)}`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-latest',
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        console.error('AI classification failed:', response.status);
        return results;
      }

      const data = await response.json();
      const content = data.content?.[0]?.text || '';

      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        for (const item of parsed) {
          results.set(item.id, {
            type: item.type || 'other',
            groupName: item.groupName || 'Uncategorized',
            confidence: item.confidence || 0.5,
          });
        }
      }
    } catch (error) {
      console.error('AI classification error:', error);
      return results;
    }
  }

  return results;
}

// ==================== Main Classifier ====================

export interface ClassificationResult {
  groups: TabGroup[];
  ungrouped: TabInfo[];
}

export async function classifyTabs(
  tabs: TabInfo[],
  options: { useAI: boolean; apiKey?: string }
): Promise<ClassificationResult> {
  const validTabs = tabs.filter(t => 
    t.url && 
    !t.url.startsWith('chrome://') && 
    !t.url.startsWith('chrome-extension://') &&
    !t.url.startsWith('about:')
  );

  if (validTabs.length === 0) {
    return { groups: [], ungrouped: [] };
  }

  // Try AI classification first if enabled
  if (options.useAI && options.apiKey) {
    const aiResults = await classifyWithAI(validTabs, options.apiKey);
    
    if (aiResults.size > 0) {
      const groupMap = new Map<string, TabGroup>();
      const ungrouped: TabInfo[] = [];

      for (const tab of validTabs) {
        const result = aiResults.get(tab.id);
        if (result && result.confidence > 0.3) {
          const groupKey = result.groupName;
          if (!groupMap.has(groupKey)) {
            groupMap.set(groupKey, {
              id: `group-${result.type}-${Date.now()}`,
              name: result.groupName,
              color: GROUP_TYPE_COLORS[result.type] || 'gray' as GroupColor,
              tabs: [],
              createdAt: Date.now(),
              type: result.type,
            });
          }
          groupMap.get(groupKey)!.tabs.push(tab);
        } else {
          ungrouped.push(tab);
        }
      }

      return {
        groups: Array.from(groupMap.values()),
        ungrouped,
      };
    }
  }

  // Fallback to local classification
  const groupMap = new Map<GroupType, TabGroup>();

  for (const tab of validTabs) {
    const type = classifyTab(tab);
    
    if (!groupMap.has(type)) {
      groupMap.set(type, {
        id: `group-${type}-${Date.now()}`,
        name: type.charAt(0).toUpperCase() + type.slice(1),
        color: GROUP_TYPE_COLORS[type],
        tabs: [],
        createdAt: Date.now(),
        type,
      });
    }
    groupMap.get(type)!.tabs.push(tab);
  }

  // Sort groups by tab count (largest first)
  const groups = Array.from(groupMap.values()).sort((a, b) => b.tabs.length - a.tabs.length);

  return { groups, ungrouped: [] };
}

// ==================== Tab Suggestions ====================

export interface TabSuggestion {
  tabId: number;
  action: 'close' | 'keep' | 'save';
  reason: string;
}

export function generateSuggestions(tabs: TabInfo[]): TabSuggestion[] {
  const suggestions: TabSuggestion[] = [];
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;
  const ONE_DAY = 24 * ONE_HOUR;

  for (const tab of tabs) {
    const lastAccessed = tab.lastAccessed || 0;
    const timeSinceAccess = now - lastAccessed;

    // Duplicate detection
    const duplicates = tabs.filter(t => 
      t.id !== tab.id && 
      t.url === tab.url
    );

    if (duplicates.length > 0) {
      suggestions.push({
        tabId: tab.id,
        action: 'close',
        reason: 'Duplicate tab found',
      });
      continue;
    }

    // Very old tabs (> 3 days)
    if (timeSinceAccess > 3 * ONE_DAY) {
      suggestions.push({
        tabId: tab.id,
        action: 'close',
        reason: 'Not accessed in over 3 days',
      });
      continue;
    }

    // Old inactive tabs (> 24 hours)
    if (timeSinceAccess > ONE_DAY) {
      suggestions.push({
        tabId: tab.id,
        action: 'save',
        reason: 'Not accessed in over 24 hours',
      });
      continue;
    }

    // Keep active tabs
    suggestions.push({
      tabId: tab.id,
      action: 'keep',
      reason: 'Recently active',
    });
  }

  return suggestions;
}
