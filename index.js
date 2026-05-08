const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
});

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = 'hidekiwatanabejapan-prog/mallpro-attendance';
const WORKFLOW_FILE = 'attendance.yml';

// 今日すでに出勤報告済みかチェック用
let lastTriggeredDate = null;

async function triggerGitHubActions() {
  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref: 'main' }),
    }
  );
  return response.status === 204;
}

client.once('ready', () => {
  console.log(`✅ Bot起動: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  // ボット自身のメッセージは無視
  if (message.author.bot) return;

  const content = message.content.trim();

  // 「おはよう」を含むメッセージを検知（大文字小文字・全角半角問わず）
  if (!content.includes('おはよう') && !content.toLowerCase().includes('ohayo')) return;

  // 今日すでに実行済みの場合はスキップ
  const today = new Date().toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' });
  if (lastTriggeredDate === today) {
    await message.reply('おはようございます！本日の出勤報告はすでに完了しています ✅');
    return;
  }

  try {
    await message.reply('おはようございます！出勤報告を実行中です... ⏳');

    const success = await triggerGitHubActions();

    if (success) {
      lastTriggeredDate = today;
      await message.reply('✅ 出勤報告が完了しました！今日も頑張りましょう！');
    } else {
      await message.reply('⚠️ 出勤報告の実行に失敗しました。GitHubを確認してください。');
    }
  } catch (error) {
    console.error('エラー:', error);
    await message.reply('❌ エラーが発生しました: ' + error.message);
  }
});

client.login(DISCORD_BOT_TOKEN);

// Render用のヘルスチェックサーバー（ポートバインディングが必要なため）
const http = require('http');
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Discord Bot is running!');
}).listen(PORT, () => {
  console.log(`Health check server running on port ${PORT}`);
});
