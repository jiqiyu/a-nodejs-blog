/*
 * Configuration
 */

module.exports = {

    cookieSecret: 'jiqiyu-nodejs-ejs',
    
    db: { db: 'jqydb',
          host: 'localhost',
          user: '',
          pass: '',
          port: 27017,
          options: {
              // db: {
              //     native_parser: false
              // },
              // server: {
              //     socketOptions: {
              //         connectTimeoutMS: 3000
              //     },
              //     auto_reconnect: true
              // },
              // replSet: {},
              // mongos: {}
          }
        },
    
    userLevel: { su: 3,
                 editor: 2,
                 author: 1,
                 reg: 0
               },
    
    limit: { ontop: 0,            /* 置頂文章數不多於ontop篇，
                                     設為0表示不限制篇數 */
             postsPerPage: 3,     /* 每一頁顯示文章數 */
             less: 150,           /* <0 顯示全文，
                                     >0 顯示less個字，
                                     =0 只顯示標題 */
             cpPostsPerPage: 10   /* 控制台>管理文章頁面
                                    每一頁顯示的文章數 */
           },

    postState: { trash: -1,
                 draft: 0,
                 post: 1,
                 ppost: 2,
                 ontop: 3
               },

    tagcloud: { postsMoreThan: 0  /* 標籤雲顯示文章數多於（不含等於）
                                     postsMoreThan的標籤 */
              }
    
};