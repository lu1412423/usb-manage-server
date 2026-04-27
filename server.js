const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
app.use(cors());
app.use(express.json());

// 直接让访问 http://ip:3000 就打开网页（自动读取当前目录的Checkout.html）
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Checkout.html'));
});

// 数据库文件
const DB_PATH = './usb.db';
const db = new sqlite3.Database(DB_PATH);

// 初始化数据库表
db.serialize(() => {
  // 设备表
  db.run(`CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY,
    status TEXT DEFAULT '可借用',
    user TEXT DEFAULT '',
    borrowTime TEXT DEFAULT '',
    lastReturnUser TEXT DEFAULT '',
    lastReturnTime TEXT DEFAULT ''
  )`);

  // 日志表
  db.run(`CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    time TEXT,
    action TEXT,
    content TEXT
  )`);

  // 检查是否有初始数据
  db.get("SELECT COUNT(*) as count FROM devices", (err, row) => {
    if (row.count === 0) {
      // 插入初始设备数据
      const stmt = db.prepare("INSERT INTO devices (id, status, user, borrowTime, lastReturnUser, lastReturnTime) VALUES (?, ?, ?, ?, ?, ?)");
      for (let i = 1; i <= 3; i++) {
        stmt.run(i, '可借用', '', '', '', '');
      }
      stmt.finalize();
      console.log('✅ 初始设备数据已创建');
    }
  });
});

// 设备接口
app.get('/api/devices', (req, res) => {
  db.all("SELECT * FROM devices", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/devices', (req, res) => {
  const { id } = req.body;
  db.get("SELECT id FROM devices WHERE id = ?", [id], (err, row) => {
    if (row) return res.status(400).json({ error: '编号已存在' });
    db.run("INSERT INTO devices (id, status, user, borrowTime, lastReturnUser, lastReturnTime) VALUES (?, ?, ?, ?, ?, ?)",
      [Number(id), '可借用', '', '', '', ''], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
  });
});

app.put('/api/devices/:id', (req, res) => {
  const id = req.params.id;
  const { status, user, borrowTime, lastReturnUser, lastReturnTime } = req.body;
  db.run("UPDATE devices SET status = ?, user = ?, borrowTime = ?, lastReturnUser = ?, lastReturnTime = ? WHERE id = ?",
    [status, user || '', borrowTime || '', lastReturnUser || '', lastReturnTime || '', id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.delete('/api/devices/:id', (req, res) => {
  db.run("DELETE FROM devices WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// 日志接口
app.get('/api/logs', (req, res) => {
  db.all("SELECT * FROM logs ORDER BY id DESC LIMIT 100", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/logs', (req, res) => {
  const { time, action, content } = req.body;
  db.run("INSERT INTO logs (time, action, content) VALUES (?, ?, ?)", [time, action, content], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// 导入导出（基于数据库）
app.get('/api/export', (req, res) => {
  const exportData = { devices: [], logs: [] };
  db.all("SELECT * FROM devices", (err, devices) => {
    if (err) return res.status(500).json({ error: err.message });
    exportData.devices = devices;
    db.all("SELECT * FROM logs ORDER BY id DESC LIMIT 100", (err, logs) => {
      if (err) return res.status(500).json({ error: err.message });
      exportData.logs = logs;
      res.json(exportData);
    });
  });
});

app.post('/api/import', (req, res) => {
  const { devices, logs } = req.body;
  db.serialize(() => {
    // 清空现有数据
    db.run("DELETE FROM devices");
    db.run("DELETE FROM logs");
    // 导入设备
    const deviceStmt = db.prepare("INSERT INTO devices (id, status, user, borrowTime, lastReturnUser, lastReturnTime) VALUES (?, ?, ?, ?, ?, ?)");
    devices.forEach(d => {
      deviceStmt.run(d.id, d.status, d.user || '', d.borrowTime || '', d.lastReturnUser || '', d.lastReturnTime || '');
    });
    deviceStmt.finalize();
    // 导入日志
    const logStmt = db.prepare("INSERT INTO logs (time, action, content) VALUES (?, ?, ?)");
    logs.forEach(l => {
      logStmt.run(l.time, l.action, l.content);
    });
    logStmt.finalize();
    res.json({ success: true });
  });
});

// 启动
const PORT = 3000;
app.listen(PORT, () => {
  console.log('✅ 服务启动成功！');
  console.log('👉 访问地址：http://localhost:3000');
  console.log('👉 局域网访问：http://10.170.138.24:3000');
});

// 关闭数据库连接
process.on('exit', () => db.close());