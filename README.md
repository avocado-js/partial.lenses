[ [Tutorial](#tutorial) | [Reference](#reference) | [Background](#background) ]

Lenses are a convenient abstraction for performing updates on individual
elements of immutable data structures.  This library provides a collection of
[Ramda](http://ramdajs.com/) compatible *partial* lenses.  While an ordinary
lens can be used to view and update an existing part of a data structure, a
partial lens can *view* optional data, *insert* new data, *update* existing data
and *delete* existing data and can provide *default* values and maintain
*required* data structure parts.

In JavaScript, missing data can be mapped to `undefined`, which is what partial
lenses also do.  When a part of a data structure is missing, an attempt to view
it returns `undefined`.  When a part is missing, setting it to a defined value
inserts the new part.  Setting an existing part to `undefined` deletes it.
Partial lenses are defined in such a way that operations compose and one can
conveniently and robustly operate on deeply nested data structures.

[![npm version](https://badge.fury.io/js/partial.lenses.svg)](http://badge.fury.io/js/partial.lenses) [![Build Status](https://travis-ci.org/calmm-js/partial.lenses.svg?branch=master)](https://travis-ci.org/calmm-js/partial.lenses) [![](https://david-dm.org/calmm-js/partial.lenses.svg)](https://david-dm.org/calmm-js/partial.lenses) [![](https://david-dm.org/calmm-js/partial.lenses/dev-status.svg)](https://david-dm.org/calmm-js/partial.lenses#info=devDependencies) [![Gitter](https://img.shields.io/gitter/room/calmm-js/chat.js.svg?style=flat-square)](https://gitter.im/calmm-js/chat)

## Tutorial

Let's work with the following sample JSON object:

```js
const data = { contents: [ { language: "en", text: "Title" },
                           { language: "sv", text: "Rubrik" } ] }
```

First we import libraries

```js
import L from "partial.lenses"
import R from "ramda"
```

and compose a parameterized lens for accessing texts:

```js
const textIn = language =>
  L.compose(L.prop("contents"),
            L.required([]),
            L.normalize(R.sortBy(R.prop("language"))),
            L.find(R.whereEq({language})),
            L.default({language}),
            L.prop("text"),
            L.default(""))
```

Take a moment to read through the above definition line by line.  Each line has
a specific purpose.  The purpose of the `L.prop(...)` lines is probably obvious.
The other lines we will mention below.

### Querying data

Thanks to the parameterized search part, `L.find(R.whereEq({language}))`, of the
lens composition, we can use it to query texts:

```js
> L.view(textIn("sv"), data)
"Rubrik"
> L.view(textIn("en"), data)
"Title"
```

Partial lenses can deal with missing data.  If we use the partial lens to query
a text that does not exist, we get the default:

```js
> L.view(textIn("fi"), data)
""
```

We get this default, rather than undefined, thanks to the last part,
`L.default("")`, of our lens composition.  We get the default even if we query
from `undefined`:

```js
> L.view(textIn("fi"), undefined)
""
```

With partial lenses, `undefined` is the equivalent of empty or non-existent.

### Updating data

As with ordinary lenses, we can use the same lens to update texts:

```js
> L.set(textIn("en"), "The title", data)
{ contents: [ { language: "en", text: "The title" },
              { language: "sv", text: "Rubrik" } ] }
```

### Inserting data

The same partial lens also allows us to insert new texts:

```js
> L.set(textIn("fi"), "Otsikko", data)
{ contents: [ { language: "en", text: "Title" },
              { language: "fi", text: "Otsikko" },
              { language: "sv", text: "Rubrik" } ] }
```

Note the position into which the new text was inserted.  The array of texts is
kept sorted thanks to the `L.normalize(R.sortBy(R.prop("language")))` part of
our lens.

### Deleting data

Finally, we can use the same partial lens to delete texts:

```js
> L.set(textIn("sv"), undefined, data)
{ contents: [ { language: "en", text: "Title" } ] }
```

Note that a single text is actually a part of an object.  The key to having the
whole object vanish, rather than just the `text` property, is the
`L.default({language})` part of our lens composition.  A `L.default(value)` lens
works *symmetrically*.  When set with `value`, the result is `undefined`, which
means that the focus of the lens is to be deleted.

If we delete all of the texts, we get the required value:

```js
> R.pipe(L.set(textIn("sv"), undefined),
         L.set(textIn("en"), undefined))(data)
{ contents: [] }
```

The `contents` property is not removed thanks to the `L.required([])` part of
our lens composition.  `L.required` is the dual of `L.default`.  `L.default`
replaces undefined values when viewed and `L.required` replaces undefined values
when set.

Note that unless required and default values are explicitly specified as part of
the lens, they will both be undefined.

### Exercise

Take out one (or more) `L.required(...)`, `L.normalize(...)` or `L.default(...)`
part(s) from the lens composition and try to predict what happens when you rerun
the examples with the modified lens composition.  Verify your reasoning by
actually rerunning the examples.

### Shorthands

For clarity, the previous code snippets avoided some of the shorthands that this
library supports.  In particular,
* `L.compose(...)` can be abbreviated as `L(...)`,
* `L.prop(string)` can be abbreviated as `string`, and
* `L.set(l, undefined, s)` can be abbreviated as `L.delete(l, s)`.

### Systematic decomposition

It is also typical to compose lenses out of short paths following the schema of
the JSON data being manipulated.  Reconsider the lens from the start of the
example:

```js
const textIn = language =>
  L.compose(L.prop("contents"),
            L.required([]),
            L.normalize(R.sortBy(R.prop("language"))),
            L.find(R.whereEq({language})),
            L.default({language}),
            L.prop("text"),
            L.default(""))
```

Following the structure or schema of the JSON, we could break this into three
separate lenses:
* a lens for accessing the contents of a data object,
* a parameterized lens for querying a content object from contents, and
* a lens for accessing the text of a content object.

Furthermore, we could organize the lenses into an object following the structure
of the JSON:

```js
const M = {
  data: {
    contents: L("contents",
                L.required([]),
                L.normalize(R.sortBy(R.prop("language"))))
  },
  contents: {
    contentIn: language => L(L.find(R.whereEq({language})),
                             L.default({language}))
  },
  content: {
    text: L("text", L.default(""))
  }
}
```

Using the above object, we could rewrite the parameterized `textIn` lens as:

```js
const textIn = language => L(M.data.contents,
                             M.contents.contentIn(language),
                             M.content.text)
```

This style of organizing lenses is overkill for our toy example.  In a more
realistic case the `data` object would contain many more properties.  Also,
rather than composing a lens, like `textIn` above, to access a leaf property
from the root of our object, we might actually compose lenses incrementally as
we inspect the model structure.

### Food for thought: BST as a lens

The previous example is based on an actual use case.  In this section we look at
a more involved example: BST, binary search tree, as a lens.

Binary search might initially seem to be outside the scope of definable lenses.
However, given basic BST operations, one could easily wrap them as a primitive
partial lens.  But could we leverage lens combinators to build a BST lens more
directly?  We can.  The `L.choose` lens combinator allows for dynamic
construction of lenses based on examining the data structure being manipulated.
Inside `L.choose` we can write the ordinary BST logic to pick the correct branch
based on the key in the currently examined node and the key that we are looking
for.  So, here is our first attempt at a BST lens:

```js
const search = key =>
  L(L.default({key}),
    L.choose(n => key < n.key ? L("smaller", search(key)) :
                  n.key < key ? L("greater", search(key)) :
                                L.identity))

const valueOf = key => L(search(key), "value")
```

This actually works to a degree.  We can use the `valueOf` lens constructor to
build a binary tree:

```js
> const t = R.reduce((tree, item) => L.set(valueOf(item.key), item.value, tree),
                     undefined,
                     [{key: "c", value: 1},
                      {key: "a", value: 2},
                      {key: "b", value: 3}])
> t
{ smaller: { greater: { value: 3, key: 'b' }, value: 2, key: 'a' },
  value: 1,
  key: 'c' }
```

However, the above `search` lens constructor does not maintain the BST
structure when values are being deleted:

```js
> L.delete(valueOf('c'), t)
{ smaller: { greater: { value: 3, key: 'b' },
             value: 2,
             key: 'a' },
  key: 'c' }
```

How do we fix this?  We could check and transform the data structure to a BST
after changes.  The `L.normalize` lens can be used for that purpose.  Here is
the updated `search` definition:

```js
const search = key =>
  L(L.normalize(n =>
      undefined !== n.value   ? n         :
      n.smaller && !n.greater ? n.smaller :
      !n.smaller && n.greater ? n.greater :
      L.set(search(n.smaller.key), n.smaller, n.greater)),
    L.default({key}),
    L.choose(n => key < n.key ? L("smaller", search(key)) :
                  n.key < key ? L("greater", search(key)) :
                                L.identity))
```

Now we can also delete values from a binary tree:

```js
> L.delete(valueOf('c'), t)
{ greater: { value: 3, key: 'b' }, value: 2, key: 'a' }
```

As an exercise you could improve the normalization to maintain some balance
condition such as AVL.  Another worthy exercise would be to make it so that the
empty binary tree is `null` rather than `undefined`.

## Reference

### Usage

The lenses and operations on lenses are accessed via the default import:

```js
import L from "partial.lenses"
```

### Operations on lenses

You can access basic operations on lenses via the default import `L`:

#### [`L.compose(l, ...ls)`](#lcomposel-ls "L.compose :: (PLens s s1, ...PLens sN a) -> PLens s a")

`L(l, ...ls)` and `L.compose(l, ...ls)` both are the same as `R.compose(lift(l),
...ls.map(lift))` (see [compose](http://ramdajs.com/0.19.0/docs/#compose)) and
compose a lens from a path of lenses.

For example:

```js
> L.view(L("a", 1), {a: ["b", "c"]})
"c"
```

#### [`L.lens(get, set)`](#llensget-set "L.lens :: (Maybe s -> Maybe a) -> (Maybe a -> Maybe s -> Maybe s) -> PLens s a")

`L.lens(get, set)` is the same as `R.lens(get, set)` (see
[lens](http://ramdajs.com/0.19.0/docs/#lens)) and creates a new primitive lens.

#### [`L.over(l, x2x, s)`](#loverl-x2x-s "L.over :: PLens s a -> (Maybe a -> Maybe a) -> Maybe s -> Maybe s")

`L.over(l, x2x, s)` is the same as `R.over(lift(l), x2x, s)` (see
[over](http://ramdajs.com/0.19.0/docs/#over)) and allows one to map over the
focused element of a data structure.

For example:

```js
> L.over("elems", R.map(L.delete("x")), {elems: [{x: 1, y: 2}, {x: 3, y: 4}]})
{elems: [{y: 2}, {y: 4}]}
```

#### [`L.set(l, x, s)`](#lsetl-x-s "L.set :: PLens s a -> Maybe a -> Maybe s -> Maybe s")

`L.set(l, x, s)` is the same as `R.set(lift(l), x, s)` (see
[set](http://ramdajs.com/0.19.0/docs/#set)) and is also equivalent to `L.over(l,
() => x, s)`.

For example:

```js
> L.set(L("a", 0, "x"), 11, {id: "z"})
{a: [{x: 11}], id: "z"}
```

#### [`L.view(l, s)`](#lviewl-s "L.view :: PLens s a -> Maybe s -> Maybe a")

`L.view(l, s)` is the same as `R.view(lift(l), s)` (see
[view](http://ramdajs.com/0.19.0/docs/#view)) and returns the focused element
from a data structure.

For example:

```js
> L.view("y", {x: 112, y: 101})
101
```

#### Lifting

The idempotent `lift` operation is defined as

```js
const lift = l => {
  switch (typeof l) {
  case "string": return L.prop(l)
  case "number": return L.index(l)
  default:       return l
  }
}
```

and is available as a non-default export.  All operations in this library that
take lenses as arguments implicitly lift them.

#### [`L.delete(l, s)`](#ldeletel-s "L.delete :: PLens s a -> Maybe s -> Maybe s")

`L.delete(l, s)` is equivalent to `L.set(l, undefined, s)`.  With partial
lenses, setting to undefined typically has the effect of removing the focused
element.

For example:

```js
> L.delete(L("a", "b"), {a: {b: 1}, x: {y: 2}})
{x: {y: 2}}
```

#### [`L.deleteAll(l, s)`](#ldeletealll-s "L.deleteAll :: PLens s a -> Maybe s -> Maybe s")

`L.deleteAll(l, s)` deletes all the non `undefined` items targeted by the lens
`l` from `s`.  This only makes sense for a lens that
* can potentially focus on more than one item and
* will focus on `undefined` when it doesn't find an item to focus on.

For example:

```js
> L.deleteAll(L.findWith("a"), [{x: 1}, {a: 2}, {a: 3, y: 4}, {z: 5}])
[{x: 1}, {y: 4}, {z: 5}]
```

### Lenses

In alphabetical order.

#### [`L.append`](#lappend "L.append :: PLens [a] a")

`L.append` is a special lens that operates on arrays.  The view of `L.append` is
always undefined.  Setting `L.append` to undefined has no effect by itself.
Setting `L.append` to a defined value appends the value to the end of the
focused array.

For example:

```js
> L.set(L.append, "x", undefined)
[ 'x' ]
```

#### [`L.augment({prop: obj => val, ...props})`](#laugmentprop-obj--val-props "L.augment :: {p1 :: o -> a1, ...ps} -> PLens {...o} {...o, p1 :: a1, ...ps}")

`L.augment({prop: obj => val, ...props})` is given a template of functions to
compute new properties.  When viewing or setting undefined, the result is
undefined.  When viewing a defined object, the object is extended with the
computed properties.  When set with a defined object, the extended properties
are removed.

For example:

```js
> L.over(L.augment({y: r => r.x + 1}), r => ({x: r.x + r.y, y: 2, z: r.x - r.y}), {x: 1})
{ x: 3, z: -1 }
```

#### [`L.choose(maybeValue => PLens)`](#lchoosemaybevalue--plens "L.choose :: (Maybe s -> PLens s a) -> PLens s a")

`L.choose(maybeValue => PLens)` creates a lens whose operation is determined by
the given function that maps the underlying view, which can be undefined, to a
lens.  In other words, the `L.choose` combinator allows a lens to be constructed
*after* examining the data structure being manipulated.  The lens returned by
the function given to `L.choose` will be lifted.

For example, given:

```js
const majorAxis = L.choose(({x, y} = {}) =>
  Math.abs(x) < Math.abs(y) ? "y" : "x")
```

we get:

```js
> L.view(majorAxis, {x: 1, y: 2})
2
> L.view(majorAxis, {x: -3, y: 1})
-3
> L.over(majorAxis, R.negate, {x: 2, y: -3})
{ y: 3, x: 2 }
```

#### [`L.filter(predicate)`](#lfilterpredicate "L.filter :: (a -> Boolean) -> PLens [a] [a]")

`L.filter(predicate)` operates on arrays.  When viewed, only elements matching
the given predicate will be returned.  When set, the resulting array will be
formed by concatenating the set array and the complement of the filtered
context.  If the resulting array would be empty, the whole result will be
undefined.

For example:

```js
> L.delete(L.filter(x => x <= 2), [3,1,4,1,5,9,2])
[ 3, 4, 5, 9 ]
```

*Note:* An alternative design for filter could implement a smarter algorithm to
combine arrays when set.  For example, an algorithm based on
[edit distance](https://en.wikipedia.org/wiki/Edit_distance) could be used to
maintain relative order of elements.  While this would not be difficult to
implement, it doesn't seem to make sense, because in most cases use of
`normalize` would be preferable.

#### [`L.find(value => boolean)`](#lfindvalue--boolean "L.find :: (a -> Boolean) -> PLens [a] a")

`L.find(value => boolean)` operates on arrays like `L.index`, but the index to
be viewed is determined by finding the first element from the input array that
matches the given predicate.  When no matching element is found the effect is
same as with `L.append`.

```js
> L.deleteAll(L.find(x => x <= 2), [3,1,4,1,5,9,2])
[ 3, 4, 5, 9 ]
```

#### [`L.findWith(l, ...ls)`](#lfindwithl-ls "L.findWith :: (PLens s s1, ...PLens sN a) -> PLens [s] a")

`L.findWith(l, ...ls)` chooses an index from an array through which the given
lens, `L(l, ...ls)`, focuses on a defined item and then returns a lens that
focuses on that item.

For example:

```js
> L.view(L.findWith("x"), [{z: 6}, {x: 9}, {y: 6}])
9
> L.set(L.findWith("x"), 3, [{z: 6}, {x: 9}, {y: 6}])
[ { z: 6 }, { x: 3 }, { y: 6 } ]
```

#### [`L.firstOf(l, ...ls)`](#lfirstofl-ls "L.firstOf :: (PLens s a, ...PLens s a) -> PLens s a")

`L.firstOf(l, ...ls)` returns a partial lens that acts like the first of the
given lenses, `l, ...ls`, whose view is not undefined on the given target.  When
the views of all of the given lenses are undefined, the returned lens acts like
`l`.

Note that `L.firstOf` is an associative operation, but there is no identity
element.

#### [`L.identity`](#lidentity "L.identity :: PLens s s")

`L.identity` is equivalent to `R.lens(R.identity, R.identity)` and is the
identity element of lenses: both `L(L.identity, l)` and `L(l, L.identity)` are
equivalent to `l`.

#### [`L.index(integer)`](#lindexinteger "L.index :: Integer -> PLens [a] a")

`L.index(integer)` or `L(integer)` is similar to `R.lensIndex(integer)` (see
[lensIndex](http://ramdajs.com/0.19.0/docs/#lensIndex)), but acts as a partial
lens:
* When viewing an undefined array index or an undefined array, the result is
  undefined.
* When setting an array index to undefined, the element is removed from the
  resulting array, shifting all higher indices down by one.  If the result would
  be an array without indices (ignoring length), the whole result will be
  undefined.

#### [`L.normalize(value => value)`](#lnormalizevalue--value "L.normalize :: (s -> s) -> PLens s s")

`L.normalize(value => value)` maps the value with same given transform when
viewed and set and implicitly maps undefined to undefined.  More specifically,
`L.normalize(transform)` is equivalent to `R.lens(toPartial(transform),
toPartial(transform))` where

```js
const toPartial = transform => x => undefined === x ? x : transform(x)
```

The main use case for `normalize` is to make it easy to determine whether, after
a change, the data has actually changed.  By keeping the data normalized, a
simple `R.equals` comparison will do.

#### [`L.pick({p1: l1, ...pls})`](#lpickp1-l1-pls "L.pick :: {p1 :: PLens s a1, ...pls} -> PLens s {p1 :: a1, ...pls}")

`L.pick({p1: l1, ...pls})` creates a lens out of the given object template of
lenses and allows one to pick apart a data structure and then put it back
together.  When viewed, an object is created, whose properties are obtained by
viewing through the lenses of the template.  When set with an object, the
properties of the object are set to the context via the lenses of the template.
`undefined` is treated as the equivalent of empty or non-existent in both
directions.

For example, let's say we need to deal with data and schema in need of some
semantic restructuring:

```js
const data = {px: 1, py: 2, vx: 1.0, vy: 0.0}
```

We can use `L.pick` to create lenses to pick apart the data and put it back
together into a more meaningful structure:

```js
const asVec = prefix => L.pick({x: prefix + "x", y: prefix + "y"})
const sanitize = L.pick({pos: asVec("p"), vel: asVec("v")})
```

We now have a better structured view of the data:

```js
> L.view(sanitize, data)
{ pos: { x: 1, y: 2 }, vel: { x: 1, y: 0 } }
```

That works in both directions:

```js
> L.over(L(sanitize, "pos", "x"), R.add(5), data)
{ px: 6, py: 2, vx: 1, vy: 0 }
```

**NOTE:** In order for a lens created with `L.pick` to work in a predictable
manner, the given lenses must operate on independent parts of the data
structure.  As a trivial example, in `L.pick({x: "same", y: "same"})` both of
the resulting object properties, `x` and `y`, address the same property of the
underlying object, so writing through the lens will give unpredictable results.

Note that, when set, `L.pick` simply ignores any properties that the given
template doesn't mention.  Note that the underlying data structure need not be
an object.

#### [`L.prop(string)`](#lpropstring "L.prop :: (p :: a) -> PLens {p :: a, ...ps} a")

`L.prop(string)` or `L(string)` is similar to `R.lensProp(string)` (see
[lensProp](http://ramdajs.com/0.19.0/docs/#lensProp)), but acts as a partial
lens:
* When viewing an undefined property or an undefined object, the result is
  undefined.
* When setting property to undefined, the property is removed from the result.
  If the result would be an empty object, the whole result will be undefined.

#### [`L.props(key, ...keys)`](#lpropskey-keys "L.props :: (p1 :: a1, ...ps) -> PLens {p1 :: a1, ...ps, ...o} {p1 :: a1, ...ps}")

`L.props(k1, ..., kN)` is equivalent to `L.pick({[k1]: k1, ..., [kN]: kN})` and
focuses on a subset of properties of an object, allowing one to treat the subset
of properties as a unit.  The view of `L.props` is undefined when none of the
properties is defined.  Otherwise the view is an object containing a subset of
the properties.  Setting through `L.props` updates the whole subset of
properties, which means that any undefined properties are removed if they did
exists previously.  When set, any extra properties are ignored.

```js
> L.set(L.props("x", "y"), {x: 4}, {x: 1, y: 2, z: 3})
{ z: 3, x: 4 }
```

#### [`L.replace(inn, out)`](#lreplaceinn-out "L.replace :: Maybe s -> Maybe s -> PLens s s")

`L.replace(inn, out)`, when viewed, replaces the value `inn` with `out` and vice
versa when set.  Values are compared using `R.equals` (see
[equals](http://ramdajs.com/0.19.0/docs/#equals)).

For example:

```js
> L.view(L.replace(1, 2), 1)
2
> L.set(L.replace(1, 2), 2, 0)
1
```

The main use case for `replace` is to handle optional and required properties
and elements.  In most cases, rather than using `replace`, you will make
selective use of `default` and `required`:

##### [`L.default(out)`](#ldefaultout "L.default :: s -> PLens s s")

`L.default(out)` is the same as `L.replace(undefined, out)`.  `L.default` is
used to specify a default value for an element in case it is missing.  This can
be useful to avoid having to check for and provide default behavior elsewhere.

For example:

```js
> L.view(L("items", L.default([])), {})
[]
> L.view(L("items", L.default([])), {items: [1, 2, 3]})
[ 1, 2, 3 ]
```

##### [`L.define(value)`](#ldefinevalue "L.define :: s -> PLens s s")

`L.define(value)` is the same as `L(L.required(value), L.default(value))`.
`L.define` is used to specify a value to act as both the default value and the
required value for an element.

##### [`L.required(inn)`](#lrequiredinn "L.required :: s -> PLens s s")

`L.required(inn)` is the same as `L.replace(inn, undefined)`.  `L.required` is
used to specify that an element is not to be deleted; in case it is deleted, the
given value will be substituted instead.

For example:

```js
> L.delete(L("items", 0), {items: [1]})
undefined
> L.delete(L(L.required({}), "items", 0), {items: [1]})
{}
> L.delete(L("items", L.required([]), 0), {items: [1]})
{ items: [] }
```

## Background

### Motivation

Consider the following REPL session using Ramda 0.19.1:

```js
> R.set(R.lensPath(["x", "y"]), 1, {})
{ x: { y: 1 } }
> R.set(R.compose(R.lensProp("x"), R.lensProp("y")), 1, {})
TypeError: Cannot read property 'y' of undefined
> R.view(R.lensPath(["x", "y"]), {})
undefined
> R.view(R.compose(R.lensProp("x"), R.lensProp("y")), {})
TypeError: Cannot read property 'y' of undefined
> R.set(R.lensPath(["x", "y"]), undefined, {x: {y: 1}})
{ x: { y: undefined } }
> R.set(R.compose(R.lensProp("x"), R.lensProp("y")), undefined, {x: {y: 1}})
{ x: { y: undefined } }
```

One might assume that `R.lensPath([p0, ...ps])` is equivalent to
`R.compose(R.lensProp(p0), ...ps.map(R.lensProp))`, but that is not the case.

With partial lenses you can robustly compose a path lens from prop lenses
`R.compose(L.prop(p0), ...ps.map(L.prop))` or just use the shorthand notation
`L(p0, ...ps)`.

### Types

To illustrate the idea we could give lenses the naive type definition

```haskell
type Lens s a = (s -> a, a -> s -> s)
```

defining a lens as a pair of a getter and a setter.  The type of a partial lens
would then be

```haskell
type PLens s a = (Maybe s -> Maybe a, Maybe a -> Maybe s -> Maybe s)
```

which we can simplify to

```haskell
type PLens s a = Lens (Maybe s) (Maybe a)
```

This means that partial lenses can be composed, viewed, mapped over and set
using the same operations as with ordinary lenses.  However, primitive partial
lenses (e.g. [L.prop](#lpropstring)) are not necessarily the same as primitive
ordinary lenses (e.g. Ramda's
[lensProp](http://ramdajs.com/0.19.0/docs/#lensProp)).
