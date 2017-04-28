    项目 Xut.js 阐述下开发中一个比较核心的优化技术点，这是一套平台代码，并非某一个插件功能或者框架可以直接拿来使用，核心代码大概是6万行左右(不包含任何插件) 。这也并非一个开源项目，不能商业使用，只是为了作者开发方便同步修改代码而上传的源码

    描述下，项目提出的概念“无需程序员编程”可批量制作app应用。分２大块，１块是客户端(PPT)，默认扩展插件提供用户编辑的界面，平台会把设计逻辑与界面数据编译成前端数据资源包(前端能处理的js、css、图片等资源了)，另一个大块就是纯前端部分(Xut.js)，简单来说：前端通过读取数据包资源后，翻译出用户设计出的交互行为与可视效果。可以这样想象，苹果iTunes是一个平台，里面有超多的交互应用类型的app，每个app都是程序员开发的，现在每个app都可以通过我们这套平台生成了，但是实际上精细度与性能当然无法跟原生相比了，只能是尽可能的靠拢。在这种平台结构下前端的最大难点在于未知性，编辑数据的复杂度与数量是不可控的，可以想想下设计一个简单儿童类型的闯关游戏需要多少细节？项目介绍可以看我以前写过的一篇文章 Hybrid App技术批量制作APP应用与跨平台解决方案。

    数据的未知性，会导致应用性能呈现反比例关系，当应用数据结构越复杂运行的实际性能越差。在这种设计下，一定会印证“墨菲定律”如果你担心某种情况发生，那么它就更有可能发生，在真机上开始大批量崩溃了。这篇文章我着重描述下项目前端方面“地基”的优化，好比建房，100层与200层的地基结构肯定是不一样的，只有地基建好了，房子才能建的更高。这里所涉及的问题以及角度只是个人观点与方案，篇幅有点长，有耐心可以看看。



开发环境

1. 基于ES6规范编写，加入了flow静态检测环境
2. 开发调试基于webpack2，上线发布基于rollup+gulp
3. 编写了全套基于node的build，开发、调试、压缩、发布



核心特性

1. 单页面结构设计，采用ES6编写，加入了eslint检测与flow静态规则
2. 采用面向对象设计，继承、封装、多态
3. 设计模式,包含单列、策略、代理、迭代器、观察者、命令、中介、适配、装饰等等
3. 管理上引入了场景的概念，按场景与容器分层，层层细分管理职责，尽量做到了高内聚低耦合
4. 针对不同的设备不同的平台，提供了多种功能自动适配的方案，e.g. 显示区、图片尺寸、视频、音频、事件、动画等等
5. 项目几乎大部分运用了目前前端所能接触的到一些H5、CSS3、JS所有发布的新的特性(webgl动画也有实现,性能问题暂未直接使用)



前端的核心问题：体验与性能

用户体验与高性能是一个矛盾体，就好像软件的可维护性与高性能一样，为了追求易维护、易扩展或多或少会牺牲更多的性能为代价，当然这个只是相对而言 。回到主题，因为是跨平台，需要更多的考虑移动端的性能支持，这里不仅仅只某个功能，或某个效果或者动画，最大的问题就是“当量变堆积积累到一定程度总会产生质变”，这就是所谓的“量变产生质变”，移动设备分配给浏览器的资源总是有限的。举个例子：我们有制作一个2500页面的app应用，大概有几百兆的体积，这个不算夸张，如果是做epub甚至会出现1G以上的数据包，我们可以分解下会产生的问题



在移动端app应用上，用户交互的行为一般就3种：滑动页面、点击跳转与组合形式

点击跳转：这个相对容易处理，而且方案也很多，页面为单位，可以单页面实现，通过路由支持，这样的框架很多了
滑动翻页：与点击跳转最大的不同点就是页面的“连续性”与“页面的无缝连接”
组合形式：点击跳转与滑动翻页的行为的组合方式



点击跳转看起来更像一个原生态的APP应用设计，但是我们是平台就需要对各种不同环境各种使用进行考量，重点分析下2500页面滑动翻页。

首先滑动翻页的“连续性”与“无缝连接”就让我只能选择单页面的设计实现(这里我们必须抛开所有原生的支持情况，因为我是前端)，页尾附上了一张效果git，随便录的



页面的拼接问题

1. 页面的复杂度

    大多数前端都做过这种拼接页面，用一个swipe.js 分分钟就OK了，没啥技术难度，我只能说因为量小，而且内容简单。不服吗？来辩。我们的应用一个页面结构是这样的：其实我也不知道一个页面有多少内容，因为是平台，内容的制作是交给编辑的，理论上是无限塞进去，当然我见过最复杂的一个页面有几百个DOM节点的。简单来说，如果把这些DOM节点看做一个个对象，那么在页面上可以直观显示为，人物，动物，物品，风景各种可视的图片，每个对象上可以交叉组合绑定包含各种视频，音频，动画，事件交互等等这些不可见的行为，同时对象之间也可以相对调用，形成多对多的关系，因为实际上的交互应用就是这样设计的。DOM的组成还不止是图片，数据也可能SVG的矢量图，也有可能是文本文字或者蒙版组合，还有很多就不多说了，那么假如这样的页面有2500个呢？实际上正是因为出现过，才有了现在这篇文章。



2. 场景页

    我习惯把整个结构展现用“场景”划分，在我看来，整个应用就像一个电影，每个页面就是戏剧中的场面，每个页面场景可以上演一台自己的场景戏，每个场景页中的每个对象扮演了自己的角色。当有2500个这样的场景页时，不管是用户体验还是性能如果单纯靠swipe.js是无法满足。最直接的影响“在加载中直接崩溃”“加载的时间会无限延长”，不管哪种情况都是不应该出现的。这里不做机器的性能数据对比的了，因为都是真实的教训与经验



3. 动态加载

    多页面或者是大数据优化，业内的方案“懒加载”，类似瀑布流一样方案，可以用到再加载。甚至可以继续优化下，动态加载，加下一个页面，删除上一个页面。让整个结构上永远只保留3个页面结构：前页面，可视区页，后一页

随手画了下：动态加载的逻辑图

image

如上图所示：可以这样理解

1. 开始是2、３、４页，第３页面才是用户的可视区域

2. 向右翻页后，第４页变成可视区域，第３页为前一页，第２页是前前页

3. 创建新的第５页，删除第２页

    图简单的描述了下动态处理页面的逻辑，如果细化下去需要考虑的细节点就更多了，根据用户的行为页面的反馈可以分为，"滑动"、"反弹"、"翻页"，3种运动方式，动态加载方案需要控制2-3个页面的动态生成，在运动的时候至少要控制2个页面的坐标变化。

    我们把场景页可以想象一个正个拍摄电影的剧场，当剧组人员准备到位，导演说: action 开始，那么拍摄开始，大家各司其职，大家都处理各自的动作，演员、打灯师，摄像师等各自上演自己的戏码。如果戏中出问题了，导演会暂停，重拍。如果拍完了，就会接着拍下一场，一天结束，导演会cut。同样在一个场景页的切换中，是需要包含最少５个场景页面处理

观察图所示：

创建一个新页(开始布置剧场)
运行当前页面的自动行为(开拍)
暂停一个页面(没拍好，先停止)
还原上一个页面动作(重来)
销毁一个页面(拍完了)
如果是跳转页面的情况就更加复杂，需要最多控制8种情况(后文页面的管理与优化会提及下)



4. 体验至上

    感觉问题好像是解决了？ 其实远远不够，因为还要满足一个关键需求“快速翻页”，虽然是动态创建页面，但是用户在翻页过程中是需要等待的，动态加载一个新的页面会有性能消耗，就需要等待，如果就这种方式处理，每次翻页在手机上，至少需要等待１-2秒以上，甚至更多，这个跟手机性能、内容数据量，网络都相关，但实际上细化下内容数据处理，这里取数据、拼接结构、渲染ＤＯＭ这些都是消耗的根源

    看到一些互联网评论家也努力寻找一个成功的方程式，用户体验为王、渠道为王、内容为王...。其中对用户体验的量化方式或者标准有很多，但是作为一个用户基本的去衡量一个东西的好坏，简单点就是，用起来舒服，内容吸引人，或许还要加上一个“不收费”。在动态加载加载的情况下虽然能“简单”满足性能上的需求，但是显然无法满足“快速翻页”的需求，这理我引入了一个解决的方案 “多线程任务”



5. 多线程问题

    JS中没有多线程的概念，JS运行在浏览器中，是单线程的，每个window一个JS线程(这里抛开Web Worker与Node)，而且JS执行引擎与浏览器的绘制是共享一个线程的，换句话会说：JS引擎线程和UI线程是互斥，线程处理其中一个，另一个就会等待，当然这也能够理解，因为JS可以控制DOM。那么要实现快速翻页最关键的一步就是用户在翻页时候“线程没有被占用”,言下之意就是用户翻页的时候，新的页面任务必须完毕了，这样用户才继续翻下一页。然而实际情况并不是这么乐观，动态创建一个页面是有消耗的，这些消耗会集中几个方面：数据的处理、事件的绑定、DOM的绘制，还有中间的各种过程处理的消耗。实际上，如果只做了动态加载的方案时，每次翻页需要等待1-2秒左右等下一个创建完毕后，才能继续翻页（本地数据，这里不考虑网络的情况）



6. 定时器

    JS运行时，除了一个运行线程，引擎还提供一个消息队列，里面是各种需要当前程序处理的消息。新的消息进入队列的时候，会自动排在队列的尾端。单线程意味着js任务需要排队，如果前一个任务出现大量的耗时操作，后面的任务得不到执行，任务的积累会导致页面的“假死”。这也是js编程一直在强调需要回避的“坑”。写JS的时候，遇到一些未知的问题，往往加一个setTimeout(func, 0)非常有用，不知道有多少是摸透了这个特性，模拟多线程任务就需要通过setTimeout



7. 多线程任务方案

    假设用户在翻页的时候就会发出一条指令，“我要在翻页了”，我们将会看到这样的场景：

image

    如图所示这是一个很尴尬的场景，导演在action了，但是场景还没布置好。实际我们要的效果：此时新的页面如果还在创建就需要被强制打断，这样让用户的行为永远保持第一响应。但是问题来了，JS是单线程，怎么强制去打断任务创建了？ 其实可以反过来思考，让任务自己打断自己拥有决断权，只要每个任务知道自己的状态，是创建还是打断。简单来说：我们把一个任务会细分很多块出来，如创建一个视频，那么这个任务可以划分几个部分， "处理数据"、"拼接正确结构"、"绘制到页面"，这么3个小任务出来，每次流程运行到某一个任务段时，会通过定时器把"任务挂起”，并去主动探查下当前这个任务是否能继续运行者被强制打断，如果用户没有指示那么就继续创建，否则就被打断。

image

    值得注意的是，用户的行为操作与任务的打断是有间隔的，比如正好任务在创建了，用户翻页此时是不会立马响应的，但是它会再下一次任务马上响应，所以这个响应的速度取决于任务颗粒度的划分。

   当然任务划分不能这么傻蛋，如果一个页面要创建10个视频，那么不是要做3*10次任务中断请求了？如果是这样那么总的消耗时间是没有变化的，只是把时间打散而已，没有达到根本的效率与速度要求。而且被打断后的任务之后要怎么处理？合理的逻辑就是跟迅雷下载资源一下，断点续传， 下一次运行，应该从上一次结尾开始，而不是重新加载所有的任务



8. 动态加载+多线程任务方案

    动态加载+多线程任务方案解决了目前所遇到的翻页性能跟体验的技术壁垒，动态加载解决创建数据量过大内存与时间问题，多线程方案解快速翻页体验问题。

    实际的代码实现又是非常精细的，当快速翻页时候，如果新创建的页面正在创建阶段，那么就需要暂停创建任务处理，让用户翻页优先，当然这里需要特别注意，任务的一个断点续传的功能，在用户没有操作的情况下，后台要慢慢的补全没有创建完毕的页面，所以任务要支持断点续传从上一个未完成的进度开始，而不是又从新创建。超快速翻页完全可能导致３个都没有创建完毕，所以这时候的断点续传就需要先从当前可视区页面先继续，然后再空闲时段执行继续补充前后页面

    在场景页的切换过程中，除了外部的场景页与场景页的切换，还要涉及到场景内部的状态管理，之前动态加载中就提出了５个状态段



９. 页面的扩展：自动分栏排版

    的需求是不断的变化，因为这是平台所以就需要各种支持，让我们继续支持"自动分栏排版设计"，通俗点讲，就是在任意一个场景页中给一个新的任务:“给一段数据，有图片有文字，在不同设备上显示的时候要自动分出横向页面，可以支持滑动，还要和以前的场景页面无缝衔接”，由于都是动态的数据，页面必须动态计算出来后与正常的场景页形成无缝链接。这里要引入一个好属性，CSS3 column分栏，column这个东东我很久前做JS版的小说阅读器就用过，网络抓数据，通过column可以自动分出排版页面。表面上来看，分页操作并不复杂，但实际上分页是非常复杂的功能，这个想靠js去计算文字占用的空间，难，非常难。column的细节就不多说了，这里的主要痛点就是column的页面如何跟正常的场景页面“无缝衔接”? column数据是绑定到每个场景页中的，一个子功能，所以column的分布完全可能是间断式的，一页有，一页没有，但是我们是动态页面，而且column完全是属于动态插入的，性能考虑，也只能用到才处理。这里的方案就是把场景页通过column填充，并且支持场景页内部column本身可以翻页，然后在column前后页面边界的时候，通过一个方式调用委托全局翻页。这里可以理解内部层(column)通过可以通过接口控制外部翻页(全局)。但是不管是外部翻页还是内部翻页，都必须保持同一个翻页算法，从用户角度讲，体验是一致的。同样的问题，在网络不好的情况下，column有不全或者丢失的情况，那么就需要有一个机制进行监听观察与更新



10. 页面的扩展：不规则页面

    让每个场景页可以展示不同的可是区域，因为实际手机上显示，由于手机设备尺寸限制，那么针对图片我们尽量保持横纵比值，这样看起来效果才会更好，那么带来的问题就是如果要图片的横纵是需要跟场景页保持一致的，那么就导致了

每个页面的可视区域不一样
每个页面的缩放比不一样
每个页面翻页的速率不一样
页与页之间的翻页距离不一样了
这里因为涉及比较广，就不说原理了，估计也没兴趣，贴下几个代码地址吧 v-distance v-style



11. 页面的扩展：双页模式

    模版是单页面设计的，设计上是区分了横竖版的，如果竖版设计在浏览器上打开后，显示就是一长条两边是空白区域会相当怪异，那么在不改变设计排版的情况下，只能通过程序把原来的页面合并成双页显示，之前动态生成３页，那么现在是６页了，与之带来了一系列的细节的处理



12. 翻页扩展：竖版滑动



页面的数据查询问题

    在翻页一块强调了数据问题，那么数据会有什么问题？首先数据存储是用的sqlite存在本地的，不像传统的web页面，通过ajax获取服务器数据。当然如果是纯PC的情况下又不一样，这里讨论是移动端APP版本。html5引入Web SQL Database概念,所以前端也可以直接操作数据库了，是不是很6？完全跳出了服务端的挟持，前端开发者直接操作数据的CURD。

通过读取数据去是创建一个场景内容，但是这个数据速度的快慢是直接影响到用户体验的要素之一。一个页面涉及N多数据的的查询，可能关联很多表，几十上百条记录，如何优化？

数据查询方式


1：sql数据
    拼sql语句是不行的，你可以试试一条SQL语句耗费的时间是多少？基本上1条语句就是100毫秒了，安卓下面实测
现在一个页面就可能存在几百条数据的关联，那么直接通过语句查询是行不通的



2：缓存哈希
    把所有数据一次性读取出来，存在内存中，通过空间换时间，每次找内存中的缓存即可了。但是忽略一个问题，浏览器分配给每一个应用的内存是有限的，所以这样缓存的表数据一多，内存会溢出，应用直接崩



3: 缓存数据集
    建立数据库的引用，缓存数据集SQLResultSetRowList了，可以直接result.rows.item(0) 通过索引下表找到对应的数据，这样只需要算出数据库中每一个id对应的下标索引就可以大大加快查询数据了。简单来说就是把查询的ID转化成数据库每条数据对应的索引数映射(从0开始)，可以直接拿到这条数据，虽然前期的转化过程复杂，但是结果是美好的，数据问题也完美解决了。



页面任务的优化

页面的拼接问题中第7点抛出一个问题："如果一个页面要创建10个视频，那么不是要做3*10次任务中断请求了？"

假设一个对象的创建需要做３次中断请求操作，那么10个对象意味着需要10次数据读取、10次HTML拼接、10次绘制 ，样明显是不合理的，任务细分足够，但是任务请求太频繁，一样会拖慢时间，任务的总时间没有变化，只是被打散了而已，而且因为中断增加的异步的请求，导致场景页面对象生成的总时间会更长。

处理上，原则应该要合并相同的类型的任务，让其保持一次处理，我们可以把每个任务提供几个对外的代理接口

例如：'getData'、'getHTML'，'draw',等等，得益于JS的天然的多态机制，类似鸭子类型的概念，通过各自定义的代理接口统一获每一个任务需要创建数据、HTML节点，然后收集起来合并到到一起。这样我们在做任务中断的时候就只要处理3次了，1次读取数据，1次HTML凭借，1次绘制。性能是不是10倍增加？



对象事件的绑定







页面的管理与优化

     面向对象设计一直是鼓励将行为分布到各个对象中去，把对象再划分更细的粒度，整个代码设计都会默认遵循这一点。场景页的切换，会将每个页面的滑动行为与坐标处理等，分解到每一个独立的页面中去，赋予每个场景页有独立的处理能力，如果让传统的父容器控制翻页的逻辑变化，那么父容器就需要控制3个页面的变化逻辑了，这里还包括了翻页、滑动、反弹等行为，这样代码耦合度与复杂度就高了(考虑下如果每个场景页的尺寸是不规则的？)。不管是场景页切换，还是场景内部管理，原则都是将行为分布在每个对象内部，让这些对象自己负责个自己的行为，这也正是面向对象设计的优点之处

善用设计模式

     颗粒度的划分，可粗可细，这个根据自己设计，在xut.js项目中，可以把场景页看做一个对象，也可以把场景页内部的每个任务看做一个对象，甚至每个单独的DOM元素。在代码设计上很忌讳对象与对象直接关联，这样会产生对象之间的强耦合，但是实际上，每个对象与对象之间都可能产生错综复杂的关系，解耦的方式也有很多，比如通过观察，通过中介等等，之前强制加了下redux的思路，我只能说不是我的菜，这种单数据流的思路导致整个结构都改变了。OMG！



中介模式与观察者模式

    页为独立单位，多个场景页之间的通讯会通过一个中介层，这里我称之为"page"管理层，其实上最复杂的组合情况下，会有4个管理层，一个page，一个master，一个浮动mater，一个浮动page，每个层都可以包含多组"场景页"，多个层之间可以做整体视觉差效果，可以做共享多页面等等....，多个管理层之间也会涉及交互的问题，如果对象与对象、页面与页面直接产生一对一或多对多的关系那么就直接产生了强耦合，久而久之会形成一种网状的交叉引用，当修改其中一个任意对象时，会难以避免引起其他的问题，所以在对象与对象之间交互通讯应该要增加一个中介对象，相关对象都通过中介对象来通讯，而不是互相引用

image

如图，page层与master分别各自控制了３个场景页面组，２个层继续向上衍生中介层，层与中介之间可以通过发布订阅的方式再一次解耦，可以将page层作为为发布者，中介层作为订阅者，当page层发生改变，那么就会通知中介对象，由中介对象通知master层，引入中介后网状式的多对多的关系变成相对简单的一对多关系，如果增加新的的层级，只需要增加中介层对应的通讯控制就行了。可能感觉会比较迷惑２个模式太相像，其实是有区别的，可以看一篇文章吧 中介与观察者模式有何不同？



模板方法与钩子方法
    es6中直接支持OOP的继承语法，也就是extends，我非常喜欢用这个特性，当然大多时候extends可以被mix-in的方式替换。在整个代码设计中，同一个类型，都会有相同的行为与不同的行为，那么就可以利用继承实现"模板方法"。在多任务分配中，所有任务都会继承一个抽象父类，定义流程接口，例如：处理数据、处理结构、绘制页面等等，所有的子类都实现了父类的接口，父类可以对子类进行流行控制与探测算法的处理。这样如果我们要往页面增加新的任务的时候，就需要实现这些抽象接口就OK了，不需要管具体的探测与流程控制，如果不同的任务有流程上的变动差异也可以用“钩子”的方式去实现不同的变化，把子类实现种相同的部分挪到父类中，不同的分布具体执行各自任务部分留在子类实现。这样就很体现了“泛型”的是思想。钩子方法也是非常常见的一种手段，这个我在JQuery源码中已经有很多分解了，xut.js也是到处可见hook



命令模式
    在动态加载中提出了5个状态段处理的问题，例如：用户翻页发送请求给场景页中的每个对象，比如想让对象执行 "运行"、"停止"、"复位"、"销毁"等动作。其实用户翻页跟具体的对象其实是完全没有关联的，我并不希望把翻页的请求与每一个对象的状态直接关联，所以我希望有一种非常松耦合的方式处理程序，消除用户翻页与具体对象之间的直接耦合关系，那么我们可以把用户的请求处理的具体操作封装成commond对象，也就是命令对象。那么我们可以在任意时候去调用这个方法，那么这个方法就会执行针对对象状态的独立控制。这样的好处非常明显了，如果要做外部接口控制，那么接口只需要操控这个命令commond方法就可以了，直接解开了调用者与接收者之间的耦合关系



享元模式
    这个比较麻烦点，使用过但是后来又改了，这里可以提及下，同样的用任务为例，一个场景页，如果创建了100个音频任务，那么意味着就是构建了100个音频对象，那么100个音频对象内部，其实会有相同的共享属性存在，比如传入音频类的类型，用Flash、用插件Phonegap、或者用HTML5去播放这个音频文件，那么这个类型的的属性其实任何对象都存在的，再回头看看享元模式的条件，大量使用相似的对象，造成了内存消耗，对象大多数状态可以改变为外部状态，剥离后可以用较少的共享对象取代大量对象。可以把音频的 文件的url，界面的配置等文件，等剥离成外部状态，并创建一个管理器保存。此时在去创建音频对象的时候，其实只有3个对象了，分别对应了3个类型的，Flash、用插件Phonegap、或者用HTML5对象。调用时通过传递外部管理器到每个音频对象中去组合成一个完整的对象，这样100个音频对象，减少的最多也只会存在3个了。当然这个麻烦的就是要区分内部状态与外部状态，增加额外的外部状态管理器，而且对象如果消耗不大，优化并不明显。







装饰模式

    很长一段时间，应用都是单页的拼接模式，但是由于单页面在PC上的体验是会呈现两边空白的情况体验不好，这时应该强制改成双页并排，这样意味着以前的动态３页就变成了６页。整体的逻辑是没有改变的，但是页面数量发生了变化，那么意味着不管是创建，销毁，控制都是２个页面一起处理的，这里为了不改变以前代码内部的逻辑结构以及现有的接口，会在必要的接口与接口之间自动适配不同的处理方式，例如以前的第一页页码为１，那么现在会



其余优化

通过上面的一些优化手段，目前已经能满足现有的应用翻页性能了，优化是体现在各个细节上的

1. 引入对象池，共享了场景页的的重复的数据，尽量减少重复处理

2. 实现了多套事件机制，一套是全局用户收集派发用户行为(比如页面控制)，一套针对hammer.js适配后支持独立对象事件绑定

3. 实现全局事件机制中类似jquery的on的向上层层刷选委托处理，可以向全局注册很多不同类型的处理

4. 简单实现了类似sizzle的查找机制，增加数据筛选的速度与重复利用效率

5. 引入了vue早期batcher刷新思路，没有做虚拟dom，因为合并的文档碎片一次绘制，性能不会差



    这里列举一些模式在项目中的重要运用，至于其余什么单列、适配器、装饰、迭代、策略等模式就很常用，这里就不多提及了。有人会说，这是强加模式上去，这属于推模式和过渡设计，我就只能呵呵，开始的代码其实并不多复杂，而且随着需求的不断变化，代码就会越来越朝着"模式"的方向进化了，因为你会觉得这样改是很比较合理的。模式本来就是在面向对象设计中提炼出来的可复用的设计技巧。所以很多时候，我们写出了带了模式的代码，只是自己不觉得而已。不是为了模式而模式，是为了更好的维护，更好的复用。当快速开发完全任务交付代码之后，之后会用更多的时间去考虑程序的延展性、健壮性，通过提升代码的可维护度从而提升工作效率，长期下来，这个是利大于弊的。



功能与插件支持

场景页面支持4种缩放比值
1. 永远100%屏幕尺寸自适应
2. 宽度100% 正比自适应高度
3. 高度100%,宽度溢出可视区隐藏
4. 高度100% 正比自适应宽度



多媒体类
修复音频在移动端不能自动播放的问题
1. 音频自适应适配设备(5种方式)
2. 视频自适应适配设备(3种方式)


动画类
1. 2D普通精灵动画
2. 2.5D高级精灵动画
3. PPT动画（56种）
4. 页面零件动画与iframe零件动画（81种）



事件类
事件分为2大块
全局事件，又全局控制并且委派，主要控制翻页，与用户的组要行为
独立事件，作用于每个独立的对象上
1. 普通tap与click事件
2. 对象拖动与拖拽
3. 多种hammer.js支持的事件(14种)


支持2种缩放
1. page页面级缩放
2. 图片放大后并缩放


零碎功能
1.支持代码监听追踪用户行为
2.支持图片模式webp模式
3.支持4种工具栏配置
4.支持忙碌光标配置
5.支持自适应图片分辨率，配置不同的图片模式
6.支持翻页翻页与跳转翻页
7.支持返回上次退出页面



附上效果git一张，随便录的
