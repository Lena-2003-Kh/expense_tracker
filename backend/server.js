const express = require('express');
const pg = require('pg');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const port = 3000;
const app = express();

app.use(express.json());
app.use(cors());

const db = new pg.Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

const ALLOWED_CATEGORIES = ['Food', 'Transport', 'Bills', 'Entertainment', 'Other'];

const EXPENSE_COLUMNS = `
  id,
  title,
  amount::float8 AS amount,
  category,
  to_char(date, 'YYYY-MM-DD') AS date
`;

function isValidId(id) {
  return /^\d+$/.test(id) && Number(id) > 0;
}


function isValidDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }
  const parsed = new Date(date);
  return !isNaN(parsed) && parsed.toISOString().slice(0, 10) === date;
}


function validateExpense({ title, amount, category, date }) {
  if (typeof title !== 'string' || title.trim() === '') {
    return 'Title is required and must be a valid text.';
  }
  if (title.trim().length > 100) {
    return 'Title must be 100 characters or less.';
  }
  const numericAmount = Number(amount);
  if (amount === undefined || amount === null || amount === '' || isNaN(numericAmount) || numericAmount <= 0) {
    return 'Amount must be a number greater than 0.';
  }
  if (numericAmount >= 100000000) {
    return 'Amount is too large.';
  }
  if (!ALLOWED_CATEGORIES.includes(category)) {
    return `Category must be one of: ${ALLOWED_CATEGORIES.join(', ')}.`;
  }
  if (!isValidDate(date)) {
    return 'Date must be a valid date in YYYY-MM-DD format.';
  }
  return null;
}

app.get('/api/expenses', async (req, res) => {
  try {
    const result = await db.query(`SELECT ${EXPENSE_COLUMNS} FROM expenses ORDER BY date DESC, id DESC`);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching expenses' });
  }
});

app.get('/api/expenses/:id', async (req, res) => {
  const { id } = req.params;

  if (!isValidId(id)) {
    return res.status(404).json({ message: 'Expense not found' });
  }

  try {
    const result = await db.query(`SELECT ${EXPENSE_COLUMNS} FROM expenses WHERE id = $1`, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching expense' });
  }
});

app.post('/api/expenses', async (req, res) => {
  
  const body = req.body || {};

  const errorMessage = validateExpense(body);
  if (errorMessage) {
    return res.status(400).json({ message: errorMessage });
  }

  const { title, amount, category, date } = body;

  try {
    const query = `
      INSERT INTO expenses (title, amount, category, date)
      VALUES ($1, $2, $3, $4)
      RETURNING ${EXPENSE_COLUMNS}
    `;
    const result = await db.query(query, [title.trim(), Number(amount), category, date]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error saving expense' });
  }
});

app.put('/api/expenses/:id', async (req, res) => {
  const { id } = req.params;

  if (!isValidId(id)) {
    return res.status(404).json({ message: 'Expense not found' });
  }

  const body = req.body || {};

  const errorMessage = validateExpense(body);
  if (errorMessage) {
    return res.status(400).json({ message: errorMessage });
  }

  const { title, amount, category, date } = body;

  try {
    const query = `
      UPDATE expenses
      SET title = $1, amount = $2, category = $3, date = $4
      WHERE id = $5
      RETURNING ${EXPENSE_COLUMNS}
    `;
    const result = await db.query(query, [title.trim(), Number(amount), category, date, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error updating expense' });
  }
});

app.delete('/api/expenses/:id', async (req, res) => {
  const { id } = req.params;

  if (!isValidId(id)) {
    return res.status(404).json({ message: 'Expense not found' });
  }

  try {
    const result = await db.query('DELETE FROM expenses WHERE id = $1 RETURNING id, title', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    res.status(200).json({
      message: 'Expense deleted successfully',
      deletedExpense: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error deleting expense' });
  }
});


app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});


app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'The request body is not valid JSON.' });
  }
  console.error(err);
  res.status(500).json({ message: 'Unexpected server error' });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
