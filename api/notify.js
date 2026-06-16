export default async function handler(req, res) {
  const JSONBIN_URL = 'https://api.jsonbin.io/v3/b/6a30b79bda38895dfec73c44/latest';
  const JSONBIN_KEY = '$2a$10$af3MA0oGo3I0I8jdOTOtjOHJpVpdb9bLywFosmdWfLY5ywWrUhYHC';
  const WEBHOOK_URL = localStorage.getItem('webhookUrl'); // will be passed as param

  // Get webhook from query param
  const webhook = req.query.webhook;
  if (!webhook) {
    return res.status(400).json({ error: 'Missing webhook param' });
  }

  // Fetch tasks from JSONBin
  const binRes = await fetch(JSONBIN_URL, {
    headers: { 'X-Master-Key': JSONBIN_KEY }
  });
  const binData = await binRes.json();
  const tasks = binData.record?.tasks || [];

  // Get today and tomorrow
  const now = new Date();
  const toISO = (d) => d.toISOString().split('T')[0];
  const todayStr = toISO(now);
  const tom = new Date(now); tom.setDate(tom.getDate() + 1);
  const tomorrowStr = toISO(tom);

  // Filter pending tasks
  const pending = tasks.filter(t => t.status === '未完成');
  const todayTasks = pending.filter(t => t.due === todayStr);
  const tomorrowTasks = pending.filter(t => t.due === tomorrowStr);
  const overdueTasks = pending.filter(t => t.due < todayStr);

  if (pending.length === 0) {
    return res.status(200).json({ message: '所有任务已完成，无需推送' });
  }

  // Build message
  let msg = `📋 DocTrack 每日任务提醒\n`;
  msg += `━━━━━━━━━━━━━━\n`;
  msg += `📅 今天：${todayStr}\n\n`;

  if (overdueTasks.length > 0) {
    msg += `🔴 已逾期（${overdueTasks.length}条）\n`;
    overdueTasks.forEach(t => {
      msg += `• ${t.name}｜${t.module}｜截止${t.due}\n`;
    });
    msg += '\n';
  }

  if (todayTasks.length > 0) {
    msg += `🟠 今日到期（${todayTasks.length}条）\n`;
    todayTasks.forEach(t => {
      msg += `• ${t.name}｜${t.module}\n`;
    });
    msg += '\n';
  }

  if (tomorrowTasks.length > 0) {
    msg += `🟡 明日到期（${tomorrowTasks.length}条）\n`;
    tomorrowTasks.forEach(t => {
      msg += `• ${t.name}｜${t.module}\n`;
    });
    msg += '\n';
  }

  msg += `━━━━━━━━━━━━━━\n`;
  msg += `共 ${pending.length} 条未完成，加油！💪`;

  // Send to WeChat Work
  await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ msgtype: 'text', text: { content: msg } })
  });

  return res.status(200).json({ success: true, sent: pending.length });
}
