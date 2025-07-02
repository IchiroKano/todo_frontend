// -------------------------------
// 初期設定
// -------------------------------
//let server = "http://192.168.1.5:3000";
//let server = "http://localhost:3006";
let server = "https://ome.funnygeekjp.com/api3006";
const token = localStorage.getItem("authToken");// ローカルストレージからログイン認証トークンを取得

// -------------------------------
// HTMLを全て読み込んだ後で、自動実行するスクリプト
// -------------------------------
window.onload = function start() {
    document.getElementById('server').innerHTML = '<p>' + server + '</p>';
    // トークンがある場合、有効期限をチェック
    if (token) {
        try {
            // JWTのペイロードをデコードして有効期限を取得
            const decodedToken = JSON.parse(atob(token.split(".")[1])); 
            const exp = decodedToken.exp * 1000; // 有効期限（ミリ秒単位）
            if (Date.now() > exp) {
                console.log("トークンの有効期限が切れています。削除します...");
                localStorage.removeItem("authToken"); // 古いトークンを削除
                window.location.href = "login.html"; // ログイン画面へリダイレクト
            } else {
                document.getElementById("token").innerHTML = "<div class='d-flex justify-content-end'><i class='bi bi-person-badge'></i></div>";
            }
        } catch (error) {
            console.error("トークンの解析に失敗:", error);
            localStorage.removeItem("authToken"); // 壊れたトークンは削除
            window.location.href = "login.html"; // ログイン画面へ移動
        }
    } else {
        document.getElementById("token").innerHTML = "<div class='d-flex justify-content-end'><i class='bi bi-person-x-fill'></i><a href='login.html'>ログイン</a></div>";
    }
};


// ----------------------------------------------
// データをリスト表示する。
// 　　データベースからデータを読み込む。
// 　　読み込んだ結果をHTMLの <div id='output'></div> の場所に表示する
// ----------------------------------------------
async function getName(viewType) {
    // ログイン済みか否か検証
    if (!token) {
        document.getElementById("output").innerHTML = `<p>ログインしてください</p>`;
        console.log("ログアウトされています");
        return;
    }

    // 「未完了」と「完了済み」のどちらを表示するのか切り替える
    let url;
    if (viewType === "uncomplete") {
        url = server + "/get";       // 未完了　リストを表示
    } else {
        url = server + "/complete";  // 完了済みリストを表示
    }

    // データ読み込みAPIを実行
    try {
        const response = await fetch(url, {
            method: "GET",
            mode: "cors",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        if (!response.ok) {
            throw new Error(`(getName) APIエラー: ${response.status} ${response.statusText}`);
        }

        const jsonObj = await response.json();
        //let html = '<table class="table table-bordered"><tr><th>ID</th><th>完了</th><th>やること</th><th>実績</th><th>編集</th></tr>';
        let html = '<table class="table table-bordered">';

        jsonObj.forEach(item => {
            const strFlag = item.flag == 1 ? "<i class='bi bi-check-square-fill'></i>" : "";
            const planText = item.plan ? (item.plan.length > 26 ? item.plan.substring(0, 26) + "...": item.plan) : "計画なし";
            const resultText = item.result ? (item.result.length > 26 ? item.result.substring(0, 26) + "..." : item.result) : "-";
            // IDと完了を表にした場合
            //html += `<tr><td>${item.id}</td><td style="text-align:center;">${strFlag}</td><td>${planText}</td><td>${resultText}</td><td>`
            //    + `<button onclick="window.location.href='edit.html?id=${item.id}';" class="btn btn-secondary">...</button>`
            //    + `</td></tr>`;
            html += `<tr onclick="window.location.href='edit.html?id=${item.id}';" style="cursor: pointer;">`
                + `<td>✔️${planText}<br /><hr style="width: 70%; margin:auto; border-style:dashed;">${resultText}`
                + `</td></tr>`;
        });

        html += "</table>";
        document.getElementById("output").innerHTML = html;

    } catch (error) {
        document.getElementById("output").innerHTML = `<p>エラーが発生しました（getName()）: ${error.message}</p>`;
        console.error("(getName) Error:", error);
    }
}

// ----------------------------------------------
// 指定したデータを１個だけ表示する
// ----------------------------------------------
async function getNameByID(id) {
    try {
        // ログイン済みか否か検証
        if (!token) {
            document.getElementById("output").innerHTML = `<p>ログインしてください</p>`;
            return;
        }
        // 指定IDを検査
        if (!id) {
            console.error("IDがありません");
            document.getElementById('inputMyID').value = 'IDを指定してください';
            return;
        } else {
            document.getElementById('inputMyID').value = id;
        }
        // API呼び出し実行
        let url = server + `/getUser?id=${id}`;
        console.log('[1]ID %d を検索, %s', id, url);
        const response = await fetch(url, {
            method: "GET",
            mode: "cors",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        if (!response.ok) {
            console.log('[2]HTTP応答エラー %s', response.ok);
            throw new Error(`HTTPエラー ${response.status}`);
        }
        console.log('[2]HTTP応答成功 %s %s', response.ok);
        // HTML画面に表示する
        const data = await response.json();
        document.getElementById('inputPlan').value = data.plan;
        document.getElementById('inputResult').value = data.result;
        let strHTML = "<p>完了：<input type='checkbox' ";
        if (data.flag == 1) {
            strHTML += "checked ";
        }
        strHTML += "id='inputFlag' style='transform: scale(2.0); margin-left: 15px;'></p>";
        document.getElementById('outputFlag').innerHTML = strHTML;
    } catch (error) {
        console.error("データ取得エラー:", error);
    }
}


// ----------------------------------------------
// データベースにデータを書き込む
// ----------------------------------------------
async function putName() {
    // 完了フラグはfalseをセットする
    var plan = document.getElementById('inputPlan').value.slice(0, 249);
    var result = document.getElementById('inputResult').value.slice(0, 249);
    if (plan == '') {
        document.getElementById('output').innerHTML = '<p>名前とデータが不足しています<i class="fa-solid fa-pen"></i></p>';
        return;
    }
    try {
        document.getElementById('output').innerHTML = '<p>書き込みしています</p><i class="fa fa-cog fa-spin fa-3x fa-fw"></i>';
        const url = `${server}/create`;
        const response = await fetch(url, {
            method: "POST",
            mode: "cors",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"        
            },
            body: JSON.stringify({
                flag: false,
                plan: plan,
                result: result
            })        
        });
        if (!response.ok) {
            throw new Error('(putName) APIサーバーに届きません。ネットワークの応答が正しくありません');
        }
        let html = "やること［" + plan + "］と実績［" + result + "］を書き込みました";
        document.getElementById('output').innerHTML = html;
    }  catch (error) {
        document.getElementById('output').innerHTML = '<p>エラーが発生しました（putName()）<br />' + error +'</p>';
        console.error('(putName) Error:', error);
    }
}

// ----------------------------------------------
// データを削除する
// ----------------------------------------------
async function deleteName() {
    var targetID = document.getElementById('inputMyID').value;
    if (targetID === '') {
        document.getElementById('output').innerHTML = '<p>削除するIDが不足しています<i class="fa-solid fa-pen"></i></p>';
        return;
    }
    try {
        document.getElementById('output').innerHTML = '<p>削除しています</p><i class="fa fa-cog fa-spin fa-3x fa-fw"></i>';
        const url = `${server}/delete/${targetID}`; //  IDをURLのパスに含める
        const response = await fetch(url, {
            method: "DELETE",
            mode: "cors",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        if (!response.ok) {
            throw new Error(`(deleteName) APIサーバーに届きません。ステータス: ${response.status} ${response.statusText}`);
        }
        let html = `ID［${targetID}］を削除しました`;
        document.getElementById('output').innerHTML = html;
    } catch (error) {
        document.getElementById('output').innerHTML = `<p>エラーが発生しました（deleteName()）<br />${error}</p>`;
        console.error('(deleteName) Error:', error);
    }
}

// ----------------------------------------------
// データベースを更新する
// ----------------------------------------------
async function updateName() {
    var myID = document.getElementById('inputMyID').value;
    var flag = document.getElementById('inputFlag').checked;
    var plan = document.getElementById('inputPlan').value.slice(0, 249);
    var result = document.getElementById('inputResult').value.slice(0, 249);
    if (!myID) {
        document.getElementById('output').innerHTML = '<p>更新するIDが不足しています<i class="fa-solid fa-pen"></i></p>';
        return;
    }
    try {
        document.getElementById('output').innerHTML = '<p>データを変更しています<i class="fa fa-cog fa-spin fa-3x fa-fw"></i></p>';
        const url = `${server}/update/${myID}`; // IDをURLパスに含める
        const response = await fetch(url, {
            method: "PUT",
            mode: "cors",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                flag: flag,
                plan: plan,
                result: result
            })
        });
        if (!response.ok) {
            throw new Error(`(updateName) APIサーバーに届きません。ステータス: ${response.status} ${response.statusText}`);
        }
        let html = `やること［${plan}］と実績［${result}］を更新しました`;
        document.getElementById('output').innerHTML = html;
    } catch (error) {
        document.getElementById('output').innerHTML = `<p>エラーが発生しました（updateName()）<br />${error}</p>`;
        console.error('(updateName) Error:', error);
    }
}