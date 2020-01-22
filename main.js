/*****************************************/
// ╔══╗───╔╗╔╗───╔╗───────╔═══╦═══╦╗────╔╗
// ║╔╗║──╔╝╚╣║───║║───────║╔═╗╠╗╔╗║║───╔╝╚╗
// ║╚╝╚╦╦╩╗╔╣╚═╦═╝╠══╦╗─╔╗║╚══╗║║║║╚═╦═╩╗╔╝
// ║╔═╗╠╣╔╣║║╔╗║╔╗║╔╗║║─║║╚══╗║║║║║╔╗║╔╗║║
// ║╚═╝║║║║╚╣║║║╚╝║╔╗║╚═╝║║╚═╝╠╝╚╝║╚╝║╚╝║╚╗
// ╚═══╩╩╝╚═╩╝╚╩══╩╝╚╩═╗╔╝╚═══╩═══╩══╩══╩═╝
// ──────────────────╔═╝║
// ──────────────────╚══╝
//
// Telegram: @andrey_bashtovoy
// Instagram: @andrey_bashtovoy_sd
// GitHub: github.com/andreybashtovoy
/*****************************************/

let telegram = require('telegram-bot-api');
let mysql      = require('mysql');
let schedule = require('node-schedule');
let fs = require("fs");

// Считывание JSON-файла с токеном бота и данными базы данных
let bot_config = JSON.parse(fs.readFileSync("config.json", "utf8"));

// Создание объекта для работы с ботом
let api = new telegram({
    token: bot_config.token,
    updates: {
        enabled: true
    }
});

// Получение тега бота
let TAG;

api.getMe().then(function(data){
    TAG = data.username;
});

// Создание объекта для работы с БД
let connection = mysql.createConnection({
    host     : bot_config.host,
    user     : bot_config.user,
    password : bot_config.password,
    database : bot_config.database
});

// Этой штукой делаем, чтобы программа не разрывала связи с БД, просто делаем запрос каждые 5 сек.
setInterval(function () {
    connection.query('SELECT 1');
}, 5000);

// Подключаемся к БД
connection.connect();


// Функция, которая задана 2-м параметром срабатывает каждый раз, когда боту приходит сообщение
api.on('message', function(message){
    for(let i in message.entities){ // Проверяем все entities сообщения (комманды, теги и т.п.)
        if(message.entities[i].type == 'bot_command' && message.entities[i].offset == 0){ // Если среди них есть команды и они в самом начале строки
            connection.query(`SHOW TABLES LIKE "chat_${message.chat.id}"`, function (error, results, fields){ // Существует ли таблица текущего чата
                if (error) throw error;
                if (results.length === 0){ // Если не существует, то создаем
                    connection.query(`CREATE TABLE \`chat_${message.chat.id}\`(
                                            id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
                                            user_id INT,
                                            username VARCHAR(20),
                                            first_name VARBINARY(20),
                                            last_name VARBINARY(20),
                                            dr_day TINYINT UNSIGNED,
                                            dr_month TINYINT UNSIGNED
                                       )`, function (error, results, fields){

                        if (error) throw error;
                        onCommand(message, message.text.slice(message.entities[i].offset, message.entities[i].offset + message.entities[i].length)); // Функция для обработки комманд
                    });
                    connection.query(`INSERT INTO \`chats\`(\`id\`, \`title\`) VALUES (${message.chat.id},'${message.chat.title}')`); // Добавляем чат в таблицу с чатами
                }else{
                    onCommand(message, message.text.slice(message.entities[i].offset, message.entities[i].offset + message.entities[i].length)); // Функция для обработки комманд
                }
            });
        }
    }
});


// Срабатывает, когда в сообщении есть команда
function onCommand(message, command){
    /***************/

    /*     /dr     */

    /***************/

    if(command == '/dr'){
        connection.query(`SELECT * FROM \`chat_${message.chat.id}\` WHERE user_id=${message.from.id}`, function (error, results, fields){ // Берем инфу пользователя из БД
            if (error) throw error;
            if(message.text.split(' ').length === 1){ // Если просто /dr
                if(results.length === 0){
                    api.sendMessage({
                        chat_id: message.chat.id,
                        text: '*Введи "/dr дд.мм", чтобы бот запомнил твой ДР.*',
                        parse_mode: 'Markdown',
                        reply_to_message_id: message.message_id
                    });
                }else{
                    api.sendMessage({
                        chat_id: message.chat.id,
                        text: `*До твоего дня рождения осталось ${toDate([results[0].dr_day, results[0].dr_month])} дней.*`,
                        parse_mode: 'Markdown',
                        reply_to_message_id: message.message_id
                    });
                }
            }else{ // Если /dr что-то
                let date = message.text.split(' ')[1].split('.'); // Вырезаем из сообщения дату и формируем массив

                if(!validDate(parseInt(date[0]), parseInt(date[1]))){ // валидная ли дата
                    api.sendMessage({
                        chat_id: message.chat.id,
                        text: '*ЪУЪ!*',
                        parse_mode: 'Markdown',
                        reply_to_message_id: message.message_id
                    });
                    return 1;
                }

                if(results.length === 0){ //Если пользователь новый, вписываем
                    connection.query(`INSERT INTO \`chat_${message.chat.id}\`(\`user_id\`, \`username\`, \`first_name\`, \`last_name\`, \`dr_day\`, \`dr_month\`)
                                                                        VALUES (${message.from.id},'${message.from.username}','${message.from.first_name}','${message.from.last_name}',${date[0]},${date[1]})`);
                }else{ // Если нет, обновляем
                    connection.query(`UPDATE \`chat_${message.chat.id}\` SET \`dr_day\`=${date[0]},\`dr_month\`=${date[1]} WHERE user_id=${message.from.id}`);
                }


                api.sendMessage({
                    chat_id: message.chat.id,
                    text: `*ОК! До твоего дня рождения осталось ${toDate(date)} дней.*`,
                    parse_mode: 'Markdown',
                    reply_to_message_id: message.message_id
                });
            }
        });

    }

    /***************/

    /*     /drs    */

    /***************/

    if(command == '/drs'){
        let page = 1;

        /*if(message.text.split(' ').length !== 1){
            if(!isNaN(parseInt(message.text.split(' ')[1]))){
                page = parseInt(message.text.split(' ')[1]);
            }
        }*/

        getDrs(message, page, function(str, pages){ // запрашивает строку с днями рождения и вызывает функцию
            connection.query(`SELECT * FROM \`chats\` WHERE id=${message.chat.id}`, function (error, results, fields){ // Запрашиваем строку чата из БД
                if (error) throw error;
                if(results[0].last_message != 0) // Если последнее сообщение с ДР есть в базе
                    api.deleteMessage({
                        chat_id: message.chat.id,
                        message_id: results[0].last_message
                    }).then(function(){},function(){}); // Удаляем его
            });


            // И отправляем новое
            api.sendMessage({
                chat_id: message.chat.id,
                text: str,
                parse_mode: 'Markdown',
                reply_to_message_id: message.message_id,
                reply_markup: getButtons(page, pages)
            }).then(function(message){
                connection.query(`UPDATE \`chats\` SET \`last_message\`=${message.message_id} WHERE id=${message.chat.id}`);
            });
        });
    }

    /***************/

    /*    /date    */

    /***************/

    if(command == '/date'){
        if(message.text.split(' ').length < 3){ // Если команда состоит меньше, чем из трех слов
            api.sendMessage({
                chat_id: message.chat.id,
                text: '*Введи "/date дд.мм событие", чтобы бот напомнил об этом событии.*',
                parse_mode: 'Markdown',
                reply_to_message_id: message.message_id
            });
        }else{
            let date = message.text.split(' ')[1].split('.'); // Получаем массив даты из сообщения

            if(!validDate(parseInt(date[0]), parseInt(date[1]))){ // Проверяем на валидность
                api.sendMessage({
                    chat_id: message.chat.id,
                    text: '*ЪУЪ!*',
                    parse_mode: 'Markdown',
                    reply_to_message_id: message.message_id
                });
                return 1;
            }

            // Записываем в базу
            connection.query(`INSERT INTO \`dates\`(\`chat_id\`, \`day\`, \`month\`, \`text\`) VALUES (${message.chat.id}, ${date[0]},${date[1]},'${message.text.split(' ').slice(2).join(' ')}')`, function (error, results, fields){
                if (error) throw error;
                api.sendMessage({
                    chat_id: message.chat.id,
                    text: '*ОК!*',
                    parse_mode: 'Markdown',
                    reply_to_message_id: message.message_id
                });
            });
        }
    }

    /***************/

    /*   /dates    */

    /***************/

    if(command == '/dates'){
        // Ищем в базе строки текущего чата
        connection.query(`SELECT * FROM \`dates\` WHERE chat_id=${message.chat.id}`,function (error, results, fields){
            if (error) throw error;

            if(results.length > 0){ // Если они есть, составляем строку
                let str = "🗓 _Список важных дат_\n\n";

                for(let i in results){
                    str=str+`▪️*${results[i].day}.${results[i].month}*: _${results[i].text}_ (№${results[i].id})\n`;
                }

                api.sendMessage({
                    chat_id: message.chat.id,
                    text: str,
                    reply_to_message_id: message.message_id,
                    parse_mode: 'Markdown'
                });
            }else{ // Если нет
                api.sendMessage({
                    chat_id: message.chat.id,
                    text: "*Список пуст*",
                    reply_to_message_id: message.message_id,
                    parse_mode: 'Markdown'
                });
            }
        });
    }

    /***************/

    /*  /del_date  */

    /***************/

    if(command == '/del_date'){
        if(message.text.split(' ').length === 1){ // Если просто /del_date
            api.sendMessage({
                chat_id: message.chat.id,
                text: '*Введи "/del_date номер", чтобы удалить дату. Номер можно узнать командой /dates*',
                reply_to_message_id: message.message_id,
                parse_mode: 'Markdown'
            });
        }else{ // Если указан номер
            if(!isNaN(parseInt(message.text.split(' ')[1]))){ // Валидное ли число в команде
                connection.query(`DELETE FROM \`dates\` WHERE id=${message.text.split(' ')[1]}`);
                api.sendMessage({
                    chat_id: message.chat.id,
                    text: '*ОК!*',
                    reply_to_message_id: message.message_id,
                    parse_mode: 'Markdown'
                });
            }else{
                api.sendMessage({
                    chat_id: message.chat.id,
                    text: '*ЪУЪ!*',
                    reply_to_message_id: message.message_id,
                    parse_mode: 'Markdown'
                });
            }
        }
    }
}


//Функция проверки валидности даты
function validDate(day, month){
    month -= 1;

    let now = new Date();
    let d = new Date(now.getFullYear(), month, day);

    if(Math.floor(now.getTime()/1000/60/60/24) > Math.floor(d.getTime()/1000/60/60/24))
        d = new Date(now.getFullYear()+1, month, day);

    return d.getMonth() == month && d.getDate() == day;
}

// Срабатывает во время клика по кнопкам под сообщениями
api.on('inline.callback.query', function(msg){
    getDrs(msg.message, parseInt(msg.data), function(str, pages){
        api.editMessageText({
            chat_id: msg.message.chat.id,
            message_id: msg.message.message_id,
            text: str,
            parse_mode: 'Markdown',
            reply_markup: getButtons(parseInt(msg.data), pages)
        });
    });
});

// Возвращает объект с кнопками, которые будут под сообщением
function getButtons(page, pages){
    let inlineKeyboard;

    if(pages == 1){
        //
    }else if(page == 1){
        inlineKeyboard = {
            inline_keyboard: [
                [
                    {
                        text: '➡️',
                        callback_data: page+1
                    }
                ]
            ]
        };
    }else if(page == pages){
        inlineKeyboard = {
            inline_keyboard: [
                [
                    {
                        text: '⬅️',
                        callback_data: page-1
                    }
                ]
            ]
        };
    }else{
        inlineKeyboard = {
            inline_keyboard: [
                [
                    {
                        text: '⬅️',
                        callback_data: page-1
                    },
                    {
                        text: '➡️',
                        callback_data: page+1
                    }
                ]
            ]
        };
    }

    return(JSON.stringify(inlineKeyboard));
}

// Генерирует строку со всеми ДР
function getDrs(message, page, func){
    connection.query(`SELECT * FROM \`chat_${message.chat.id}\``, function (error, results, fields){ // Берем всех людей из чата
        if (error) throw error;
        let arr = [];

        // Составляем массив из людей и их ДР
        for (let i in results){
            let name = results[i].last_name == 'undefined' ? results[i].first_name.toString() : results[i].first_name + ' ' + results[i].last_name;
            arr.push([name, toDate([results[i].dr_day, results[i].dr_month]), results[i].dr_day, results[i].dr_month]);
        }


        // Сортируем пузырьком
        for (let j = arr.length - 1; j > 0; j--){
            for (let i = 0; i < j; i++) {
                if (arr[i][1] > arr[i + 1][1]) {
                    let temp = arr[i];
                    arr[i] = arr[i + 1];
                    arr[i + 1] = temp;
                }
            }
        }

        let str = `_Дни рождения всех участников_ (стр. ${page})\n\n`;
        let smiles = ['🎂', '🍰', '🥃', '🍷', '🥂', '🍪', '🍾', '💎', '🎈', '🎁', '🎉', '🔞'];
        let in_page = 2;

        let smile;

        //Составляем итоговую строку
        for (let i in arr) {
            if (parseInt(i) >= (page-1) * in_page && parseInt(i) < (page-1) * in_page + in_page){
                smile = smiles[Math.floor(Math.random() * smiles.length)];
                str = str + smile + ' *' + arr[i][0] + "*: _" + arr[i][2] + "." + arr[i][3] + '_  (Осталось *' + arr[i][1] + '* дней)' + "\n";
            }
        }

        //Вызываем калбэк
        func(str, Math.ceil(arr.length/in_page));
    });
}


// Считает, сколько дней осталось до даты
function toDate(arr){
    arr[1] -= 1;

    let now = new Date();
    let d = new Date(now.getFullYear(), arr[1], arr[0], 10);

    if(Math.floor(now.getTime()/1000/60/60/24) > Math.floor(d.getTime()/1000/60/60/24))
        d = new Date(now.getFullYear()+1, arr[1], arr[0]);

    return Math.ceil((d.getTime()-now.getTime())/1000/60/60/24);
}


//Функция, которая будет запускаться в 7 утра и вечера
//schedule.scheduleJob('0,30 * * * * *', function(){
schedule.scheduleJob('0 0 7,19 * * *', function(){
    // Напоминания про ДР
    connection.query(`SHOW TABLES`, function (error, results, fields) {
        if (error) throw error;

        for(let i in results) {
           if(results[i].Tables_in_birthday.startsWith('chat_')){
               let chat_id = parseInt(results[i].Tables_in_birthday.split('chat_')[1]);

               connection.query(`SELECT * FROM \`${results[i].Tables_in_birthday}\``,function (error1, results1, fields1){
                   if (error1) throw error1;

                   for(let j in results1){
                       if(toDate([results1[j].dr_day, results1[j].dr_month]) == 1){
                           api.sendMessage({
                               chat_id: chat_id,
                               text: `*Завтра день рождения у @${results1[j].username}!*`,
                               parse_mode: 'Markdown'
                           });
                       }else if(toDate([results1[j].dr_day, results1[j].dr_month]) == 0){
                           api.sendMessage({
                               chat_id: chat_id,
                               text: `*Сегодня день рождения у @${results1[j].username}!*`,
                               parse_mode: 'Markdown'
                           });
                       }

                       api.getChatMember({
                           chat_id: chat_id,
                           user_id: results1[j].user_id
                       }).then(function(user){
                            if(
                                user.user.first_name != results1[j].first_name ||
                                user.user.last_name != results1[j].last_name ||
                                user.user.username != results1[j].username
                            ){
                                connection.query(`UPDATE \`chat_${chat_id}\` SET \`username\`='${user.user.username}',\`first_name\`='${user.user.first_name}',\`last_name\`='${user.user.last_name}' WHERE user_id=${results1[j].user_id}`);
                            }
                       });
                   }
               });
           }
        }

    });

    // Напоминания про важные даты
    connection.query(`SELECT * FROM \`dates\``,function (error, results, fields){
        if (error) throw error;

        for(let i in results){
            if(toDate([results[i].day, results[i].month]) == 1){
                api.sendMessage({
                    chat_id: results[i].chat_id,
                    text: `*Завтра ${results[i].text}*`,
                    parse_mode: 'Markdown'
                });
            }else if(toDate([results[i].day, results[i].month]) == 0){
                api.sendMessage({
                    chat_id: results[i].chat_id,
                    text: `*Сегодня ${results[i].text}*`,
                    parse_mode: 'Markdown'
                });
            }
        }
    });
});