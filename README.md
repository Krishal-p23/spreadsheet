# 📊 Spreadsheet Engine (React + Vite)

A lightweight spreadsheet application built using **React and Vite**, supporting formula evaluation, cell dependencies, and dynamic updates—similar to basic Excel functionality.

---

## 🚀 Features

### 🧮 Formula Support
- Arithmetic operations: `+`, `-`, `*`, `/`
- Cell referencing (e.g., `=A1 + B2`)
- Parentheses support
- Multiple cell references in a single formula

### 🔗 Dependency Management
- Automatic propagation of updates across dependent cells
- Maintains a dependency graph for efficient updates
- Recalculates only affected cells (optimized performance)

### ⚠️ Error Handling
- Invalid formulas → `#ERROR`
- Circular references → `#CIRCULAR`
- Invalid references → `#REF`
- Errors are isolated and do not break the entire grid

### 🔁 Undo / Redo
- Supports undo (Ctrl + Z) and redo (Ctrl + Y)
- Efficient state history tracking

### 📐 Responsive Grid
- 10×10 spreadsheet (A1–J10)
- Fully interactive and editable cells
- Updates dynamically with changes

---

## 🛠️ Tech Stack

- **Frontend:** React (JSX)
- **Build Tool:** Vite
- **Styling:** TailwindCSS
- **Language:** JavaScript (converted from TypeScript)

---

## 📂 Project Structure

```
spreadsheet/
├── public/
├── src/
│   ├── components/     # Grid, Cell components
│   ├── utils/          # Formula parser, dependency graph logic
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/your-username/spreadsheet-engine.git
cd spreadsheet-engine
```

---

### 2️⃣ Install Dependencies

Make sure you have **Node.js (v16 or above)** installed.

```bash
npm install
```

---

### 3️⃣ Start Development Server

```bash
npm run dev
```

---

### 4️⃣ Open in Browser

Visit:

```
http://localhost:5173/
```

---

## 🧪 Example Usage

| Input | Result |
|------|--------|
| `A1 = 5` | 5 |
| `B1 = =A1 + 3` | 8 |
| `C1 = =B1 * 2` | 16 |

---

### 🔄 Dynamic Updates

If:

```
A1 = 10
```

Then automatically:
- `B1 → 13`
- `C1 → 26`

---

## ⚠️ Error Cases

| Scenario | Output |
|---------|--------|
| Invalid formula (`=A1 +`) | `#ERROR` |
| Circular reference | `#CIRCULAR` |
| Invalid reference | `#REF` |

---

## 📌 Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

---

## 🌐 Deployment

You can deploy this project easily using:

- Vercel  
- Netlify  

---

## 🧠 Key Concepts Implemented

- Dependency Graph (Directed Graph)  
- Efficient Recalculation (Topological / DFS-based)  
- Formula Parsing & Evaluation  
- State Management for Undo / Redo  

---

## 🚀 Future Enhancements

- Dynamic grid resizing  
- Advanced functions (SUM, AVG, MIN, MAX)  
- Keyboard navigation (arrow keys)  
- Copy-paste functionality  
- UI/UX improvements  

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository  
2. Create a new branch  
3. Make your changes  
4. Submit a pull request  

---

## 📜 License

This project is open-source and available under the MIT License.

---

## 👨‍💻 Author

**Krishal Prasad**  
B.Tech CSE, NIT Delhi