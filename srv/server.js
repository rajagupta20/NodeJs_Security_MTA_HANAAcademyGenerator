const express = require('express');
const app = express();
const bodyParser = require('body-parser');

const xsenv = require('@sap/xsenv');
xsenv.loadEnv();
const services = xsenv.getServices({
        uaa: { tag: 'xsuaa' }
                ,
        hana: { tag: 'hana' }
    });


const xssec = require('@sap/xssec');
const passport = require('passport');
passport.use('JWT', new xssec.JWTStrategy(services.uaa));
app.use(passport.initialize());
app.use(passport.authenticate('JWT', {
    session: false
}));

// placed after authentication - business user info from the JWT will be set as HANA session variables (XS_)
const hdbext = require('@sap/hdbext');
app.use(hdbext.middleware(services.hana));

app.use(bodyParser.json());

app.get('/srv/user', function (req, res) {
        if (req.authInfo.checkScope('$XSAPPNAME.User')) {
            res.status(200).json(req.user);
        } else {
        res.status(403).send('Forbidden');
    }
    });

const {
    desc
} = require("@sap-cloud-sdk/core");

const {
    SalesOrder,
    SalesOrderItem
} = require("@sap/cloud-sdk-vdm-sales-order-service");

function getSalesOrders() {
    return SalesOrder.requestBuilder()
        .getAll()
        .filter(SalesOrder.TOTAL_NET_AMOUNT.greaterThan(2000))
        .top(3)
        .orderBy(new desc(SalesOrder.LAST_CHANGE_DATE_TIME))
        .select(
            SalesOrder.SALES_ORDER,
            SalesOrder.LAST_CHANGE_DATE_TIME,
            SalesOrder.INCOTERMS_LOCATION_1,
            SalesOrder.TOTAL_NET_AMOUNT,
            SalesOrder.TO_ITEM.select(SalesOrderItem.MATERIAL, SalesOrderItem.NET_AMOUNT)
        )
        .withCustomHeaders({
            'APIKey': '2BKsGO7MiyKAeiSRDITy64y4vhrZRY8Z'
        })
        .execute({
            url: 'https://sandbox.api.sap.com/s4hanacloud'
            //destinationName: ''
        });
}

app.get("/srv/salesorders", function (req, res) {
        if (req.authInfo.checkScope('$XSAPPNAME.User')) {
            getSalesOrders()
        .then(salesOrders => {
            res.status(200).json(salesOrders);
        });
        } else {
        res.status(403).send('Forbidden');
    }
    });

app.get('/srv/sales', function (req, res) {
        if (req.authInfo.checkScope('$XSAPPNAME.User')) {
                    let sql = `SELECT * FROM "nodejs_mta_app_hanaacademy.db::sales" WHERE "region" IN (SELECT * FROM JSON_TABLE((('{"values":' || SESSION_CONTEXT('XS_REGION')) || '}'), '$.values[*]' COLUMNS("VALUE" VARCHAR(5000) PATH '$')))`;
                req.db.exec(sql, function (err, results) {
            if (err) {
                res.type('text/plain').status(500).send('ERROR: ' + err.toString());
                return;
            }
            res.status(200).json(results);
        });
        } else {
        res.status(403).send('Forbidden');
    }
    });

app.get('/srv/session', function (req, res) {
        if (req.authInfo.checkScope('$XSAPPNAME.Admin')) {
            req.db.exec('SELECT * FROM M_SESSION_CONTEXT', function (err, results) {
            if (err) {
                res.type('text/plain').status(500).send('ERROR: ' + err.toString());
                return;
            }
            res.status(200).json(results);
        });
        } else {
        res.status(403).send('Forbidden');
    }
    });

app.get('/srv/db', function (req, res) {
        if (req.authInfo.checkScope('$XSAPPNAME.Admin')) {
            req.db.exec('SELECT SYSTEM_ID, DATABASE_NAME, HOST, VERSION, USAGE FROM M_DATABASE', function (err, results) {
            if (err) {
                res.type('text/plain').status(500).send('ERROR: ' + err.toString());
                return;
            }
            res.status(200).json(results);
        });
        } else {
        res.status(403).send('Forbidden');
    }
        });

const port = process.env.PORT || 5001;
app.listen(port, function () {
    console.info('Listening on http://localhost:' + port);
});
