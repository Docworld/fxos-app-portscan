// WIN
function isFxOS() {
  return (typeof (navigator) == 'object' && navigator.mozTCPSocket);
}
function isNodeJS() {
  return (typeof (navigator) == 'require');
}
if (typeof alert == 'undefined')
  alert = console.log
if (typeof console == 'undefined')
  alert = function() { }

if (isFxOS()) {
  if (navigator.TCPSocket) {
    var TCPSocket = navigator.TCPSocket;
  } else {
    var TCPSocket = navigator.mozTCPSocket;
  }
} else {
if (typeof(require) != "undefined") {
  var TCPSocket = require("tcp-socket");
} else {
  var TCPSocket = { open: function() {
console.log ("unsupported platform");
}};
}
}

function SocketID(s) {
  if (typeof (s) != 'undefined')
    return s.host + ":" + s.port;
  return "";
}

// TODO: retrieve service signature (HTTP HEAD, SMTP BANNER, ...)
// unused
var ssl = ['https', 'irc-ssl', 'pop3s', 'imaps']

var services = {
  "http": 80,
  "finger": 79,
  "https": 443,
  "ftp-data": 20,
  "ftp": 21,
  "ftps-data": 989,
  "imaps": 993,
  "ftps": 990,
  "smtp": 25,
  "pop3": 110,
  "pop3s": 995,
  "ntp": 123,
  "snmp": 161,
  "rsync": 873,
  "telnet": 23,
  "ssh": 22,
  "cups": 631,
  "irc": 6667,
  "ircs": 994, // 6697
};

function Scanner(hosts, ports, options, emit) {
  if (TCPSocket === undefined) {
    alert ("No TCPSocket API here");
    return undefined;
  }
  var self = this;
  var sockets = {};
  self.running = true;
  self.cancel = function() {
    console.log ("^C");
    // stop all loops
    self.running = false;
    // close all sockets
    for (var s in sockets) {
      if (sockets[s])
        if (sockets[s].close) {
          sockets[s].close ();
          sockets[s] = undefined;
      }
    }
  }
  self.timeout = function(n) {
    setTimeout (self.cancel, n);
  }
  if (options.timeout) {
    self.timeout (options.timeout);
  }
  function parseHosts(x) {
    var arr = [];
    ('' + x).split (',').forEach (function(a) {
      var ip = a.split (".");
      if (ip.length == 4) {
        if (ip[3] == '*') {
          for (var i = 0; i < 255; i++) {
            var aip = ip[0] + "." + ip[1] + "." + ip[2] + "." + i;
            arr.push (aip);
          }
        } else {
          var aip = ip[0] + "." + ip[1] + "." + ip[2] + ip[3];
          // TODO: check if they are numbers
          // detect if they are ranges
          arr.push (aip);
        }
      } else {
        arr.push (a);
      }
    });
    // 192.168.0.1-20
    // 192.168.0.1-20
    // 192.168.0.*
    // 192.168.0/24
    // av.com,gogle.com,x90.es
    return arr;
  }
  function parsePorts(x) {
    // 1-19,20,30
    // http,ssh,ftp
    if (!x || x == "") {
      var knownports = [];
      for (var svc in services)
        knownports.push (+services[svc]);
      return knownports;
      //knownports = [21,22,23,25,80,110,993,443,631];
      //console.log(knownports.length* 255)
    }
    var p = []
    var csv = ('' + x).split (",");
    for (var i = 0; i < csv.length; i++) {
      var word = '' + csv[i];
      var dash = word.split ("-");
      if (dash.length > 1) {
        // push range
        for (var a = +dash[0]; a < +dash[1]; a++) {
          p.push (+a || a);
        }
      } else {
        p.push (+word || word);
      }
    }
    return p;
  }
  if (typeof (hosts) == "string")
    hosts = parseHosts (hosts);
  if (typeof (ports) == "string")
    ports = parsePorts (ports);
  if (typeof (hosts) !== "object")
    throw "wrong hosts";
  if (typeof (ports) !== "object")
    throw "wrong ports";
  function testPort(host, port) {
    var s = TCPSocket.open (host, port);
    //	alert("test "+host+":"+port+" "+s.readyState);
    sockets[SocketID(s)] = s;
    if (false) {
      setTimeout(function() {
        if (emit) emit(s.readyState, host, port);
        sockets[SocketID(s)] = undefined
        s.close();
      }, 1000); //connect timeout?
    } else {
if (typeof (s) != "undefined") {
      /*those are tcp-socket.js only*/
      s.onerror = function(x) {
        sockets[SocketID(s)] = undefined
        s.close();

	setTimeout (function() {
		if (emit) emit ('closed', host, port);
	}, 10);
        //	console.log("CLOSED", port);
      }
      s.onopen = function() {
        sockets[SocketID(s)] = undefined
        s.close();
        if (emit) emit ('open', host, port);
        //	console.log("OPEN", port);
      }
}
    }
    //	alert ("readyState:"+s.readyState)
  }
  function isKnownPort(port) {
    for (var s in services) {
      if ((s == port) || (services[s] == port))
        return true;
    }
    return false;
  }
  setTimeout (function() {
    if (options.fast) {
      /* scan known services */
      hosts.forEach (function(h) {
        ports.forEach (function(p) {
          if (!self.running)
            return;
          if (isKnownPort (p))
            testPort (h, p, emit);
        });
      });
      if (!options.known) {
        /* scan the rest */
        hosts.forEach (function(h) {
          ports.forEach (function(p) {
            if (!self.running)
              return;
            if (!isKnownPort (p))
              testPort (h, p, emit);
          });
        });
      }
    } else {
      if (options.known) {
        hosts.forEach (function(h) {
          ports.forEach (function(p) {
            if (!self.running)
              return;
            if (isKnownPort (p))
              testPort (h, p, emit);
          });
        });
      } else {
        hosts.forEach (function(h) {
          ports.forEach (function(p) {
            if (!self.running)
              return;
            testPort (h, p, emit);
          });
        });
      }
    }
    emit ('done');
    return true;
  }, 1); // make it async!

  return self;
}


/* main */

if (!isFxOS() && isNodeJS()) {
  /* NodeJS */
  var argv = process.argv;

  var hosts = "localhost,radare.org";
  var ports = "10-90,600-700";

  if (argv.length > 2) {
    hosts = argv[2];
  }
  if (argv.length > 3) {
    ports = argv[3];
  }
  try {
    var first = new Date().getTime();
    var options = {
      fast: true,
      known: false,
      timeout: 0
    }
    var scan = Scanner (hosts, ports, options, function(state, h, p) {
      //alert("emit "+state)
      if (state == 'open' || state == 'opened') {
        var now = new Date().getTime();
        console.log (now - first, state, h, p);
      }
    });
  } catch (e) {
    console.error ("OOPS", e.stack);
  }
}

