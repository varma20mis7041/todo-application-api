const express = require("express");
const app = express();
app.use(express.json());

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const path = require("path");
const dpPath = path.join(__dirname, "todoApplication.db");

let db = null;
const initilizeDbAndServer = async () => {
  try {
    db = await open({
      filename: dpPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("SERVER STARTED");
    });
  } catch (error) {
    console.log(`ERRRRRRRRRRRRROR ${error.message}`);
    process.exit(1);
  }
};

initilizeDbAndServer();
function convert(dbObject) {
  return {
    id: dbObject.id,
    todo: dbObject.todo,
    priority: dbObject.priority,
    status: dbObject.status,
    category: dbObject.category,
    dueDate: dbObject.due_date,
  };
}
//API 1

app.get("/todos/", async (request, response) => {
  console.log(1);
  const queryObject = request.query;
  let sqlQuery;
  const status = queryObject.status;
  const priority = queryObject.priority;
  const category = queryObject.category;
  switch (true) {
    case queryObject.priority !== undefined && queryObject.status !== undefined:
      sqlQuery = `SELECT * FROM todo WHERE priority = '${queryObject.priority}' AND status = '${queryObject.status}'`;
      break;
    case queryObject.category !== undefined && queryObject.status !== undefined:
      sqlQuery = `SELECT * FROM todo WHERE category = '${queryObject.category}' AND status = '${queryObject.status}'`;
      break;
    case queryObject.category !== undefined &&
      queryObject.priority !== undefined:
      sqlQuery = `SELECT * FROM todo WHERE category = '${queryObject.category}' AND priority = '${queryObject.priority}'`;
      break;
    case queryObject.status !== undefined:
      console.log(2);
      if (status === "TO DO" || status === "IN PROGRESS" || status === "DONE") {
        sqlQuery = `SELECT * FROM todo WHERE status = '${queryObject.status}'`;
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }

      break;
    case queryObject.priority !== undefined:
      if (priority === "LOW" || priority == "MEDIUM" || priority == "HIGH") {
        sqlQuery = `SELECT * FROM todo WHERE priority = '${queryObject.priority}'`;
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }

      break;
    case queryObject.search_q !== undefined:
      sqlQuery = `SELECT * FROM todo WHERE todo LIKE '%${queryObject.search_q}%'`;
      break;
    case queryObject.category !== undefined:
      if (
        category === "WORK" ||
        category === "HOME" ||
        category === "LEARNING"
      ) {
        sqlQuery = `SELECT * FROM todo WHERE category = '${queryObject.category}'`;
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }

      break;
    default:
      break;
  }
  if (sqlQuery !== undefined) {
    const dbResults = await db.all(sqlQuery);
    response.send(dbResults.map((eachItem) => convert(eachItem)));
  }
});

// api 2

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoSqlQuery = `SELECT * FROM todo WHERE id = ${todoId}`;
  const dbResults = await db.get(getTodoSqlQuery);
  response.send(convert(dbResults));
});

// api3
// app.get("/agenda/", async (request, response) => {
//   const { date } = request.query;
//   if (date === undefined) {
//     response.status(400);
//     response.send("Invalid Due Date");
//   } else {
//     console.log(1);
//     const dueDateSqlQuery = `SELECT * FROM todo WHERE due_date =${date}`;
//     const dbResults = await db.all(dueDateSqlQuery);
//     response.send(dbResults);
//   }
// });

// app.get("/agenda/", async (request, response) => {
//   const { date } = request.query;
//   if (date === undefined) {
//     response.status(400);
//     response.send("Invalid Due Date");
//   } else {
//     console.log(1);
//     const dueDateSqlQuery = `SELECT * FROM todo WHERE due_date = '${date}'`;
//     const dbResults = await db.all(dueDateSqlQuery);
//     response.send(dbResults);
//   }
// });

const { parseISO, isSameDay } = require("date-fns");

app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  if (date === undefined) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    console.log(1);
    const parsedDate = parseISO(date);
    const dueDateSqlQuery = `SELECT * FROM todo`;
    const dbResults = await db.all(dueDateSqlQuery);
    const filteredResults = dbResults.filter((item) =>
      isSameDay(parseISO(item.due_date), parsedDate)
    );
    response.send(filteredResults);
  }
});

module.exports = app;
