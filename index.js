const { Client, GatewayIntentBits } = require('discord.js');
const cron = require('node-cron');

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
const DISCORD_CHANNEL_ID = '1487748424450314280';

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

async function runAttendance(channel) {
  const today = new Date().toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' });
  if (lastTriggeredDate === today) {
    console.log('本日の出勤報告はすでに完了しています');
    return;
  }

  try {
    if (channel) await channel.send('おはようございます！出勤報告を実行中です... ⏳');
    console.log('出勤報告を実行中...');

    const success = await triggerGitHubActions();

    if (success) {
      lastTriggeredDate = today;
      if (channel) await channel.send('✅ 出勤報告が完了しました！今日も頑張りましょう！');
      console.log('出勤報告が完了しました');
    } else {
      if (channel) await channel.send('⚠️ 出勤報告の実行に失敗しました。GitHubを確認してください。');
      console.log('出勤報告に失敗しました');
    }
  } catch (error) {
    console.error('エラー:', error);
    if (channel) await channel.send('❌ エラーが発生しました: ' + error.message);
  }
}

client.once('ready', () => {
  console.log(`✅ Bot起動: ${client.user.tag}`);

  // 毎朝8時（JST）に自動実行 → UTC 23時
  cron.schedule('0 23 * * *', async () => {
    console.log('定刻8時: 自動出勤報告を実行します');
    const channel = client.channels.cache.get(DISCORD_CHANNEL_ID);
    await runAttendance(channel);
  }, {
    timezone: 'UTC'
  });

  console.log('毎朝8時（JST）の自動出勤報告スケジュールが設定されました');
});

// Discordで「おはよう」と送った場合も手動実行可能
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const content = message.content.trim();
  if (!content.includes('おはよう') && !content.toLowerCase().includes('ohayo')) return;

  await runAttendance(message.channel);
});

client.login(DISCORD_BOT_TOKEN);

// Render用ヘルスチェックサーバー
const http = require('http');
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Discord Bot is running!');
}).listen(PORT, () => {
  console.log(`Health check server running on port ${PORT}`);
});
