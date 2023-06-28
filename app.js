const express = require("express");
const app = express();
app.use(express.json());

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const path = require("path");
const dpPath = path.join(__dirname, "todoApplication.db");

let db = null;

const format = require("date-fns/format");
const isValid = require("date-fns/isValid");
const toDate = require("date-fns/toDate");
const { parseISO } = require("date-fns");
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

const validateDate = async (request, response, next) => {
  const { date } = request.query;
  //   if (date !== undefined) {
  //     try {
  //       const myDate = new Date(date);

  //       const formatedDate = format(new Date(date), "yyyy-MM-dd");
  //       console.log(formatedDate, "f");
  //       const result = toDate(
  //         new Date(
  //           `${myDate.getFullYear()}-${myDate.getMonth() + 1}-${myDate.getDate()}`
  //         )
  //       );
  //       console.log(result, "r");
  //       console.log(new Date(), "new");

  //       const isValidDate = await isValid(result);
  //       console.log(isValidDate, "V");
  //       if (isValidDate === true) {
  //         request.date = formatedDate;
  //       } else {
  //         response.status(400);
  //         response.send("Invalid Due Date");
  //         return;
  //       }
  //     } catch (e) {
  //       response.status(400);
  //       response.send("Invalid Due Date");
  //       return;
  //     }
  //   }
  if (date !== undefined) {
    try {
      console.log(date);
      const myDate = new Date(date);
      const formatedDate = format(new Date(date), "yyyy-MM-dd");
      console.log(formatedDate, "--->formatedDate");

      const result = toDate(
        new Date(
          `${myDate.getFullYear()}-${myDate.getMonth() + 1}-${myDate.getDate()}`
        )
      );
      console.log(result, "r");
      //console.log(new Date(), "new");

      const isDateValid = await isValid(result);
      console.log(isDateValid, "V");
      if (isDateValid === true) {
        request.date = formatedDate;
      } else {
        response.status(400);
        response.send("Invalid Due Date");
        return;
      }
    } catch (e) {
      response.status(400);
      response.send("Invalid Due Date");
      return;
    }
  }
  next();
};
// app.get("/agenda/", validateDate, async (request, response) => {
//   const { date } = request;
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

app.get("/agenda/", validateDate, async (request, response) => {
  const { date } = request;
  console.log(date, "a");

  const selectDuaDateQuery = `
        SELECT
            id,
            todo,
            priority,
            status,
            category,
            due_date AS dueDate
        FROM 
            todo
        WHERE 
            due_date = '${date}'
        ;`;

  const todosArray = await db.all(selectDuaDateQuery);

  if (todosArray === undefined) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    response.send(todosArray);
  }
});

const requestBody = (request, response, next) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  const { todoId } = request.params;

  if (priority !== undefined) {
    const priorityArray = ["LOW", "MEDIUM", "HIGH"];
    const validPriority = priorityArray.includes(priority);
    if (validPriority) {
      request.priority = priority;
    } else {
      response.status(400);
      response.send("Invalid Todo Priority");
      return;
    }
  }
  if (status !== undefined) {
    const statusArray = ["TO DO", "IN PROGRESS", "DONE"];
    const validStatus = statusArray.includes(status);
    if (validStatus) {
      request.status = status;
    } else {
      response.status(400);
      response.send("Invalid Todo Status");
      return;
    }
  }
  if (category !== undefined) {
    const categoryArray = ["HOME", "WORK", "LEARNING"];
    const validCategory = categoryArray.includes(category);
    if (validCategory) {
      request.category = category;
    } else {
      response.status(400);
      response.send("Invalid Todo Category");
      return;
    }
  }

  if (dueDate !== undefined) {
    try {
      const myDate = new Date(dueDate);
      const formatedDate = format(myDate, "yyyy-MM-dd");
      const result = toDate(new Date(formatedDate));
      const isDateValid = isValid(result);
      if (isDateValid == true) {
        request.dueDate = formatedDate;
      } else {
        response.status(400);
        response.send("Invalid Due Date");
        return;
      }
    } catch (error) {
      response.status(400);
      response.send("Invalid Due Date");
      return;
    }
  }
  request.todo = todo;
  request.id = id;
  request.todoId = todoId;
  next();
};

// API 4
app.post("/todos/", requestBody, async (request, response) => {
  console.log(20);
  const { id, todo, priority, status, category, dueDate } = request;
  const updateSqlQuery = `INSERT 
  INTO todo(id,todo,category,priority,status,due_date)
    VALUES (${id},'${todo}','${category}','${priority}','${status}','${dueDate}')  `;
  const dbRequest = await db.run(updateSqlQuery);

  response.send("Todo Successfully Added");
});

//api-5

app.put("/todos/:todoId/", requestBody, async (request, response) => {
  console.log(40);
  const { todoId } = request;
  const { status, priority, todo, category, dueDate } = request;
  let query = null;
  console.log(status, priority, todo, category, dueDate);
  switch (true) {
    case status !== undefined:
      console.log(30);
      console.log(status);
      query = `UPDATE
                     todo
                SET 
                    status = '${status}'
                WHERE id = ${todoId}`;
      await db.run(query);
      console.log("end");
      response.send("Status Updated");
      break;
    case priority !== undefined:
      query = `UPDATE
                     todo
                SET 
                    priority = '${priority}'
                WHERE id = ${todoId}`;
      await db.run(query);
      response.send("Priority Updated");
      break;
    case category !== undefined:
      query = `UPDATE
                     todo
                SET 
                    category = '${category}'
                WHERE id = ${todoId}`;
      await db.run(query);
      response.send("Category Updated");
      break;
    case todo !== undefined:
      query = `UPDATE
                     todo
                SET 
                    todo = '${todo}'
                WHERE id = ${todoId}`;
      await db.run(query);
      response.send("Todo Updated");
      break;
    case dueDate !== undefined:
      query = `UPDATE
                     todo
                SET 
                    due_date = '${dueDate}'
                WHERE id = ${todoId}`;
      await db.run(query);
      response.send("Due Date Updated");
      break;
    default:
      break;
  }
});

//API 6 :
app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const sqlQuery = `DELETE FROM todo WHERE id = ${todoId}`;
  await db.run(sqlQuery);
  response.send("Todo Deleted");
});
module.exports = app;
