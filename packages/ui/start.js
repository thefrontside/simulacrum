const { main, daemon } = require('@effection/node');

main(function*(scope) {
  let server = daemon(`node ../server/dist/start.js`, {
    env: {
      PORT: 3000,
      PATH: process.env.PATH
    }
  }).run(scope);

  scope.spawn(writeOut(server.stdout, process.stdout));
  scope.spawn(writeOut(server.stderr, process.stderr));

  yield function*(child) {
    yield server.stdout.stringBuffer(child).filter(buffer => buffer.indexOf('running') > -1).expect();
  };


  let parcel = daemon(`parcel serve app/index.html --port ${process.env.PORT}`).run(scope);

  scope.spawn(writeOut(parcel.stderr, process.stderr));

  yield writeOut(parcel.stdout, process.stdout);

});

function writeOut(channel, out) {
  return channel.forEach(function (data) {
    return new Promise((resolve, reject) => {
      out.write(data, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
}
