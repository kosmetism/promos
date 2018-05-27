#!/usr/bin/env node

const env = process.env.NODE_ENV || 'development';

const path = require('path');
const fs = require('fs-extra');
const YAML = require('yamljs');
const walkdir = require('walkdir');
const waterfall = require('async/waterfall');
const parallelLimit = require('async/parallelLimit');
const sass = require('node-sass');
const nunjucks = require('nunjucks');
const browserify = require('browserify');
const envify = require('envify/custom');

const outputPath = path.join(__dirname, '../dist');
const sourcePaths = walkdir.sync(path.join(__dirname, '../src'), {max_depth: 1});
const dirPaths = sourcePaths.filter(p => fs.lstatSync(p).isDirectory());
const dirTasks = dirPaths.map(p => {
  const filePaths = walkdir.sync(p);

  const tasks = [
    parseContent(p),
    compileCSS(p),
    compileJS(p),
    renderTemplate(p),
    outputHTML(p)
  ];


  return done => {
    waterfall(tasks, (err) => {
      done(err);
    });
  };
});

parallelLimit(dirTasks, 20, (err, result) => {
  console.log(err ? err : '🎉 Success!');
});

function parseContent (p) {
  return done => {
    const slug = path.basename(p);
    const yamlPath = path.join(p, './content.yml');

    if (!fs.existsSync(yamlPath)) {
      return done(null, { slug });
    }

    const data = YAML.load(yamlPath);

    done(null, Object.assign({ slug }, data));
  };
}

function renderTemplate (p) {
  return (store, done) => {
    nunjucks.configure(p);

    store.timestamp = Date.now();
    const html = nunjucks.render('index.html', store);

    done(null, Object.assign(store, { html }));
  }
}

function compileCSS (p) {
  return (store, done) => {
    const scssPath = path.join(p, './index.scss');

    if (!fs.existsSync(scssPath)) {
      return done(null, store);
    }

    const sassOpts = {
      file: scssPath,
      compressed: true,
      includePaths: [
        path.join(__dirname, '../node_modules', 'normalize-scss/sass'),
        path.join(__dirname, '../node_modules', 'font-awesome/scss')
      ]
    };

    sass.render(sassOpts, (err, result) => {
      if (err) {
        return done(err);
      }

      const cssPath = './index.css';
      const fullCssPath = path.join(outputPath, env, store.slug, cssPath);

      fs.outputFile(fullCssPath, result.css, (err) => {
        if (err) {
          return done(err);
        }

        done(null, Object.assign(store, {
          css: cssPath,
          cssFull: fullCssPath
        }));
      });
    });
  };
}

function compileJS (p) {
  return (store, done) => {
    const jsNextPath = path.join(p, './index.js');

    if (!fs.existsSync(jsNextPath)) {
      return done(null, store);
    }

    const jsPath = './index.js';
    const fullJsPath = path.join(outputPath, env, store.slug, jsPath);

    browserify(jsNextPath)
      .transform('babelify', {
        presets: ['es2015', 'stage-0']
      })
      .transform(envify({
        NODE_ENV: env
      }))
      .bundle((err, buf) => {
        if (err) {
          return done(err);
        }

        fs.outputFile(fullJsPath, buf.toString('utf-8'), (err) => {
          if (err) {
            return done(err);
          }

          done(null, Object.assign(store, {
            js: jsPath,
            jsFull: fullJsPath
          }));
        });
      });
  };
}

function outputHTML (p) {
  return (store, done) => {
    const htmlFilePath = path.join(outputPath, env, store.slug, './index.html');

    fs.outputFile(htmlFilePath, store.html, done);
  }
}
