# Expense Tracker

A web app to track personal expenses. You can add an expense (title, amount, category, date), see all expenses in a table, filter them by category, edit or delete them, and see the total, the number of expenses and the highest expense right away.

- **Backend:** Node.js + Express REST API, data saved in PostgreSQL (`pg` library)
- **Frontend:** HTML, CSS, vanilla JavaScript (`fetch` + `async/await`) and Bootstrap 5

## Project Structure

```
expense-tracker/
├── frontend/
│   ├── index.html        page structure (Bootstrap)
│   ├── css/style.css     CSS Grid for the summary cards + dark mode
│   └── js/app.js         all the logic: fetch calls, rendering, filter, edit, delete
├── backend/
│   ├── server.js         Express API (5 endpoints)
│   ├── package.json
│   ├── schema.sql        creates the expenses table + sample data
│   └── .env.example      template for the database settings
├── Screenshots/
└── README.md
```

## How to Run the Project from Zero

**Requirements:** Node.js (LTS), PostgreSQL with pgAdmin, and VS Code with the **Live Server** extension.

### 1. Create the database
1. Open **pgAdmin** and create a new empty database named `expense_tracker`.
2. Open the **Query Tool** on the `expense_tracker` database.
3. Open the file `backend/schema.sql`, copy its content into the Query Tool and run it.
   This creates the `expenses` table and adds some sample data.

### 2. Write the `.env` file
1. In the `backend` folder, copy `.env.example` to a new file named `.env`.
2. Open `.env` and write your own PostgreSQL password in `DB_PASSWORD` (change the other values only if your setup is different).

```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_NAME=expense_tracker
```

> The `.env` file contains your password. It is never uploaded and never submitted.

### 3. Install the packages and start the server
Open a terminal inside the `backend` folder:

```bash
npm install
```

```bash
node server.js
```

You should see: `Server is running on port 3000`. Keep this terminal open while you use the app.

### 4. Open the front-end
1. Open the `frontend` folder in VS Code.
2. Right-click `index.html` and choose **Open with Live Server**.
3. The page loads the expenses from the API automatically.

> If the server is not running, the page shows a clear alert: *"Cannot connect to the server. Please check if the backend is running."*

---

## Phase 1: Backend API

Base URL: `http://localhost:3000`

| Method | Path | What it does | Success | Errors |
|--------|------|--------------|---------|--------|
| GET | `/api/expenses` | Returns all expenses | `200` | — |
| GET | `/api/expenses/:id` | Returns one expense | `200` | `404` |
| POST | `/api/expenses` | Adds a new expense | `201` | `400` |
| PUT | `/api/expenses/:id` | Updates an expense | `200` | `400`, `404` |
| DELETE | `/api/expenses/:id` | Deletes an expense | `200` | `404` |

An expense looks like this:

```json
{
  "id": 1,
  "title": "Lunch",
  "amount": 4.5,
  "category": "Food",
  "date": "2026-01-15"
}
```

**How the backend works**
- Every query uses parameters (`$1`, `$2`, ...). User data is never joined into the SQL text, so SQL injection is not possible.
- The database creates the `id`, and `RETURNING` sends back the new or updated row.
- `pg` returns `NUMERIC` as text and `DATE` as a JS Date, so the SELECT converts them with `amount::float8` and `to_char(date, 'YYYY-MM-DD')`.
- One `validateExpense()` function is shared by POST and PUT. It returns `400` with a `message` when:
  - the title is empty (or longer than 100 characters),
  - the amount is not a number greater than 0,
  - the category is not one of `Food`, `Transport`, `Bills`, `Entertainment`, `Other`,
  - the date is not a real date in `YYYY-MM-DD` format.
- The `id` is checked before the query. If it is not a positive whole number, or it does not exist, the answer is `404`.
- A body that is not valid JSON returns `400`, and unknown routes return `404`, both as JSON.
- CORS is enabled so the front-end can call the API.

### API test screenshots

| Test | Result | Screenshot |
|------|--------|------------|
| GET all expenses | 200 OK | [view](Screenshots/Phase%201/Screenshot%202026-09-25%20205155.png) |
| GET one expense (`/1`) | 200 OK | [view](Screenshots/Phase%201/Screenshot%202026-09-25%20205213.png) |
| GET an id that does not exist (`/10`) | 404 Not Found | [view](Screenshots/Phase%201/Screenshot%202026-09-25%20205225.png) |
| POST a new expense | 201 Created | [view](Screenshots/Phase%201/Screenshot%202026-09-25%20205245.png) |
| PUT an id that does not exist (`/9`) | 404 Not Found | [view](Screenshots/Phase%201/Screenshot%202026-09-25%20205340.png) |
| PUT an existing expense (`/10`) | 200 OK | [view](Screenshots/Phase%201/Screenshot%202026-09-25%20205355.png) |
| DELETE an id that does not exist (`/9`) | 404 Not Found | [view](Screenshots/Phase%201/Screenshot%202026-09-25%20205408.png) |
| DELETE an existing expense (`/10`) | 200 OK | [view](Screenshots/Phase%201/Screenshot%202026-09-25%20205421.png) |

---

## Phase 2: Front-end

Every feature talks to the API with `fetch` and `async/await`, inside `try/catch`. All requests go through one helper function, `fetchAPI()`, which shows the spinner, reads the error `message` from the server, and shows it in a Bootstrap alert.

- **Navbar** and **3 summary cards**: total amount, number of expenses, highest expense. The cards always count **all** expenses, not only the filtered list.
- **Add form**: title, amount, category (select) and date. The form checks the values first and shows a clear message for each problem (empty title, amount of zero or less, no category, no date). On success it sends `POST`.
- **Table**: title, amount, category as a coloured badge, date, and Edit / Delete buttons.
- **Filter by category**, with an "All" option.
- **Edit** in a Bootstrap modal filled with the current data. Saving sends `PUT`.
- **Delete** with a confirmation, then `DELETE`.
- After every add, edit or delete, the page asks the server for the list again (`GET`), so it always shows what is really in the database.
- **Spinner** while data is loading.
- **Alerts**: success messages close by themselves; error messages stay until the user closes them. If the server is off, the user sees a clear message instead of an empty page. If the server returns `400`, its `message` is shown.
- Titles are shown as plain text (escaped), so a title like `<b>hi</b>` can never break the page.
- No JavaScript library is used except Bootstrap.

---

## Phase 3: Polish and Delivery

- **CSS Grid**: the three summary cards are placed with CSS Grid in `css/style.css`, not with the Bootstrap grid:
  ```css
  .summary-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
  }
  ```
  `auto-fit` + `minmax(250px, 1fr)` puts the cards in one row on a wide screen and stacks them on a phone, without any media query.
- **Responsive design**: tested on phone width in DevTools. The form and table stack on small screens, and the table scrolls inside its card (`table-responsive`).
- **Clean code**: clear names, shared helper functions instead of repeated code, and no leftover `console.log` in the front-end.

### Bonus features
- **Search by title**: a text input filters the table while you type.
- **Sort the table**: click a column title (Title, Amount, Category, Date) to sort ascending, click again for descending.
- **Export to CSV**: downloads all expenses as `expenses.csv`.
- **Dark mode**: a switch that changes the whole page to dark colours.

---

## The Hardest Thing I Faced

**The problem:**
Making the filter by category, the search by title, and the column sorting work together. At first, using one of them would reset or override the others. For example, sorting the table would bring back expenses that were hidden by the filter.

**How I solved it:**
I keep one "source of truth": the `allExpenses` array that comes from the server. I never change it directly. Instead, one function, `applyFilter()`, builds the list to show in steps. It takes a copy of `allExpenses`, filters it by category, then by the search text, then sorts the result, and finally passes it to `renderTable()`. Every control (filter, search, sort) just updates its own value and calls `applyFilter()`, so they always work together. The summary cards use `allExpenses` directly, which is why they always show the totals for all expenses.

---

## GitHub 
[Github Link](https://github.com/Lena-2003-Kh/expense_tracker.git)
