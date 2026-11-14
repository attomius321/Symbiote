# durations

Parse and format time spans such as `1h 30m`. No dependencies.

```js
import { parse, format, clock } from 'durations';

parse('1h30m'); // 5400000
format(5_400_000); // '1h 30m'
clock(3_735_000); // '1:02:15'
```

The CLI prints each span in milliseconds:

```sh
$ dur 1h30m 90s
5400000
90000
```

Tests: `npm test` (Node 20 or later).
