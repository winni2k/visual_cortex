/**
 * Created by winni on 10/29/17.
 */
var width = $(window).width() - 20,
    height = $(window).height() - 20

var color = d3.scaleOrdinal([d3.schemeCategory20[1], d3.schemeCategory20[15]])
    .domain([false, true])

var d3cola = cola.d3adaptor(d3)
    .avoidOverlaps(true)
    .size([width, height])

var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height)

d3.json("graph.json", function (error, graph) {

    // Not sure I'm using explicit node.id for link indexing,
    // so need to force ids of nodes to match index in node array
    for (let node_idx in graph.nodes) {
        let node = graph.nodes[node_idx]
        if (+node_idx !== +node.id) {
            throw RangeError("graph.node index mismatch\n" +
                `node with id ${node.id} is not number ${node_idx} in graph.nodes array`)
        }
    }

    graph.nodes.forEach(n => n.radius = node_radius(n))
    graph.nodes.forEach(n => n.height = n.width = 2 * n.radius)

    d3cola
        .nodes(graph.nodes)
        .links(graph.edges)
        .flowLayout("x", l => l.source.radius + l.target.radius + 20)
        .symmetricDiffLinkLengths(6)
        .start(10, 20, 20)

    // define arrow markers for graph links
    svg.append('svg:defs').append('svg:marker')
        .attr('id', 'end-arrow')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 6)
        .attr('markerWidth', 3)
        .attr('markerHeight', 3)
        .attr('orient', 'auto')
        .append('svg:path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', '#000')

    var path = svg.append('g')
        .attr('class', 'paths')
        .selectAll(".link")
        .data(graph.edges)
        .enter().append('svg:path')
        .attr('class', 'link')

    var node_container = svg.append('g')
        .attr('class', 'nodes')
        .selectAll(".node")
        .data(graph.nodes)
        .enter()
        .append('g')
        .attr("class", "node")
        .attr('id', n => `node-${n.id}`)
    var circos_container = node_container.append('g')
        .attr('id', n => `circos-container-${n.id}`)
    circos_container.append('g')
        .attr('id', n => `circos-${n.id}`)
    var node_circle = node_container
        .append("circle")
        .attr('class', 'node-circle')
        .attr("r", n => n.radius)
        .style("fill", d => color(d.is_missing))
        .call(d3cola.drag)
    node_circle
        .append("title")
        .text(d => d.repr)
    node_container.each(build_circos)


    d3cola.on("tick", () => {
        path.each(d => {
            if (isIE()) this.parentNode.insertBefore(this, this)
        })
        // draw directed edges with proper padding from node centers
        path.attr('d', d => {
            var deltaX = d.target.x - d.source.x,
                deltaY = d.target.y - d.source.y,
                dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
                normX = deltaX / dist,
                normY = deltaY / dist,
                sourcePadding = d.source.radius,
                targetPadding = d.target.radius + 2,
                sourceX = d.source.x + (sourcePadding * normX),
                sourceY = d.source.y + (sourcePadding * normY),
                targetX = d.target.x - (targetPadding * normX),
                targetY = d.target.y - (targetPadding * normY)
            return `M${sourceX},${sourceY}L${targetX},${targetY}`
        })

        circos_container.attr('transform', n => `translate(${n.x},${n.y})`)
        node_circle.attr('cx', n => n.x)
        node_circle.attr('cy', n => n.y)
    })
})

function node_radius(node) {
    return Math.sqrt(node.repr.length) * 5
}
function isIE() {
    return ((navigator.appName == 'Microsoft Internet Explorer') || ((navigator.appName == 'Netscape') && (new RegExp("Trident/.*rv:([0-9]{1,}[\.0-9]{0,})").exec(navigator.userAgent) != null)))
}

function build_circos(node) {
    let container_id = `#circos-${node.id}`
    let circos = new Circos({
        container: container_id,
        width: node.width,
        height: node.height,
    })

    let layout_data = [
        {"len": 31, "color": "#8dd3c7", "label": "January", "id": "january"},
        {"len": 2, "color": "#ffffb3", "label": "February", "id": "february"},
        {"len": 31, "color": "#bebada", "label": "March", "id": "march"},
        {"len": 30, "color": "#fb8072", "label": "April", "id": "april"},
        {"len": 31, "color": "#80b1d3", "label": "May", "id": "may"},
        {"len": 30, "color": "#fdb462", "label": "June", "id": "june"},
        {"len": 31, "color": "#b3de69", "label": "July", "id": "july"},
        {"len": 31, "color": "#fccde5", "label": "August", "id": "august"},
        {"len": 30, "color": "#d9d9d9", "label": "September", "id": "september"},
        {"len": 31, "color": "#bc80bd", "label": "October", "id": "october"},
        {"len": 30, "color": "#ccebc5", "label": "November", "id": "november"},
        {"len": 31, "color": "#ffed6f", "label": "December", "id": "december"}
    ]
    let configuration = {
        innerRadius: 1,
        outerRadius: node.radius - 2,
        cornerRadius: 10,
        gap: 0.04, // in radian
        labels: {
            display: true,
            position: 'center',
            size: '14px',
            color: '#000000',
            radialOffset: 20,
        },
        ticks: {
            display: true,
            color: 'grey',
            spacing: 10000000,
            labels: true,
            labelSpacing: 10,
            //labelSuffix: 'Mb',
            labelDenominator: 1000000,
            labelDisplay0: true,
            labelSize: '10px',
            labelColor: '#000000',
            labelFont: 'default',
            majorSpacing: 5,
            size: {
                minor: 2,
                major: 5,
            }
        },
        clickCallback: null
    }

    circos.layout(layout_data, configuration)
    circos.render()

    // delete pesky transform of circos plot
    let container = $(container_id)
    let svg = container.children('svg').first()
    let match = svg.children('.all')
        .attr('transform')
        .replace(/\s/g, '')
        .match(/([\d.]+),([\d.]+)/)
    container.attr('transform', `translate(${-match[1]},${-match[2]})`)
}
