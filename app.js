import Sequelize from 'sequelize';
const fs = require('fs');
var stream;

const sequelize = new Sequelize('shortbox_old', 'root', '', {
    logging: false,
    host: 'localhost',
    dialect: 'mysql',
    define: {
        charset: 'utf8',
        dialectOptions: {
            collate: 'utf8_general_ci'
        },
        timestamps: true
    },
    operatorsAliases: false,
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
});

var content = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
    "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">";

(async () => {
    try {
        content += "\n\t<url>\n" +
            "\t\t<loc>https://shortbox.de</loc>\n" +
            "\t\t<priority>1.0</priority>\n" +
            "\t</url>";

        await addPublisher();
        await addSeries();
        await addIssues();

        content += "\n</urlset>";

        fs.writeFileSync("./sitemap.xml", content);
    } catch (e) {
        console.log(e);
    } finally {
        if (stream)
            stream.end();

        console.log("Done.");
        process.exit();
    }
})();


async function addPublisher() {
    let res = await sequelize.query("select p.original as original, p.name as name from publisher p where p.original is not null")
    res[0].forEach(entry => {
        let publisher = {
            name: entry.name,
            us: entry.original === 1
        };

        content += "\n\t<url>\n" +
            "\t\t<loc>https://shortbox.de" + generatePublisherUrl(publisher) + "</loc>\n" +
            "\t</url>"
    });
}

async function addSeries() {
    let res = await sequelize.query("select p.original as original, p.name as name, s.title as title, s.volume as volume " +
        "from series s left join publisher p on s.fk_publisher = p.id where p.original is not null");
    res[0].forEach(entry => {
        let series = {
            title: entry.title,
            volume: entry.volume,
            publisher: {
                name: entry.name,
                us: entry.original === 1
            }
        };

        content += "\n\t<url>\n" +
            "\t\t<loc>https://shortbox.de" + generateSeriesUrl(series) + "</loc>\n" +
            "\t</url>"
    });
}

async function addIssues() {
    let res = await sequelize.query("select p.original as original, p.name as name, s.title as title, s.volume as volume, " +
        "i.number as number, i.format as format, i.variant as variant FROM issue i left join series s on " +
        "i.fk_series = s.id left join publisher p on s.fk_publisher = p.id where p.original is not null");
    res[0].forEach(entry => {
        let issue = {
            number: entry.number,
            format: entry.format,
            variant: entry.variant,
            series: {
                title: entry.title,
                volume: entry.volume,
                publisher: {
                    name: entry.name,
                    us: entry.original === 1
                }
            }
        };

        content += "\n\t<url>\n" +
            "\t\t<loc>https://shortbox.de" + generateIssueUrl(issue) + "</loc>\n" +
            "\t</url>"
    });
}

function generatePublisherUrl(publisher) {
    return (publisher.us ? "/us/" : "/de/") + encodeURIComponent(publisher.name.replace(/%/g, '%25'));
}

function generateSeriesUrl(series) {
    let url = (series.publisher.us ? "/us/" : "/de/");

    return url
        + encodeURIComponent(series.publisher.name.replace(/%/g, '%25'))
        + "/"
        + encodeURIComponent(series.title.replace(/%/g, '%25') + "_Vol_" + series.volume);
}

function generateIssueUrl(issue) {
    let url = (issue.series.publisher.us ? "/us/" : "/de/");

    if (!issue.variant || issue.variant === "")
        return url
            + encodeURIComponent(issue.series.publisher.name.replace(/%/g, '%25'))
            + "/"
            + encodeURIComponent(issue.series.title.replace(/%/g, '%25') + "_Vol_" + issue.series.volume)
            + "/"
            + encodeURIComponent(issue.number.replace(/%/g, '%25'))
            + (issue.format ? ("/" + encodeURIComponent(issue.format)) : "");

    return url
        + encodeURIComponent(issue.series.publisher.name.replace(/%/g, '%25'))
        + "/"
        + encodeURIComponent(issue.series.title.replace(/%/g, '%25') + "_Vol_" + issue.series.volume)
        + "/"
        + encodeURIComponent(issue.number.replace(/%/g, '%25'))
        + "/"
        + encodeURIComponent(issue.format + "_" + issue.variant);
}