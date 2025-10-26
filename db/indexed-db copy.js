import { defaultData } from './default-data.js';

export let data;

let db;

// Открываем хранилище объектов для нашей базы данных
let openRequest = indexedDB.open('fractals', 1);

// Если база уже была создана, то сохраняем указатель не нее
openRequest.onsuccess = function(event) {
    db = event.target.result;
    const transaction = db.transaction("data","readwrite");
    const objectStore= transaction.objectStore("data");
    const getRequest = objectStore.get(1);
    getRequest.onsuccess =  event => {data = event.target.result;
    console.log(data)}
    getRequest.onerror = () => alert("Ошибка добавления в базу данных объекта по умолчанию");
    waitForElement();
};

export function waitForElement(){
    if ( typeof data !== "undefined" ){
        return;
    }
    else{
        setTimeout(waitForElement, 10);
    }
}

// Выводим сообщение об ошибке, если доступа к базе данных нет
openRequest.onerror = function(event) {
    alert("Database error: " + event.target.errorCode);
};

// Создаем хранилище объектов, если его еще не было
openRequest.onupgradeneeded = function(event) {
    db = event.target.result;
    // Создаём хранилище объектов для этой базы данных
    const objectStore = db.createObjectStore("data", {keyPath: "id", autoIncrement: true});

    // Добавляем в новое хранилище объект со значениями по умолчанию
    objectStore.add(defaultData);
    let getRequest = objectStore.get(1);
    getRequest.onsuccess =  event => data = event.target.result;
};

// Добавляем в хранилище новый объект
function add() {
    const transaction = db.transaction("data","readwrite");
    const tableDB= transaction.objectStore("data");

    let request = tableDB.add(defaultData);
    request.onerror( () =>
        alert("Ошибка добавления в базу данных объекта по умолчанию")
    );

    request.onsuccess( () =>
        alert("Объекта по умолчанию добавлен в базу данных успешно")
    );
}
