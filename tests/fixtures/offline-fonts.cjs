// Optional offline browser/build verification only. Production never sets this.
module.exports = new Proxy({}, {
  get: (_target, url) => String(url).includes('Geist+Mono')
    ? "@font-face { font-family: 'Geist Mono'; src: local('Consolas'); }"
    : "@font-face { font-family: 'Geist'; src: local('Arial'); }",
});
