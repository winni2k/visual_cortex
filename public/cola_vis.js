/**
 * Created by winni on 10/29/17.
 */
const width = $(window).width() - 20,
    height = $(window).height() - 20

const color = d3.scaleOrdinal([d3.schemeCategory20[0], d3.schemeCategory20[15]])
    .domain([false, true])

const d3cola = cola.d3adaptor(d3)
    .avoidOverlaps(true)
    .size([width, height])

const svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height)

const circle_stroke_width = 4
d3.json("graph.json", function (error, graph) {

    // Not sure I'm using explicit node.id for link indexing,
    // so need to force ids of nodes to match index in node array
    for (const node_idx in graph.nodes) {
        const node = graph.nodes[node_idx]
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

    const path = svg.append('g')
        .attr('class', 'paths')
        .selectAll(".link")
        .data(graph.edges)
        .enter().append('svg:path')
        .attr('class', 'link')
        .attr('stroke', l => color(l.is_missing))

    const node_container = svg.append('g')
        .attr('class', 'nodes')
        .selectAll(".node")
        .data(graph.nodes)
        .enter()
        .append('g')
        .attr("class", "node")
        .attr('id', n => `node-${n.id}`)

    const circos_container = node_container.append('g')
        .attr('id', n => `circos-container-${n.id}`)
    circos_container.append('g')
        .attr('id', n => `circos-${n.id}`)

    const inner_node_circle = node_container.append('circle')
        .attr('class', 'inner-node-circle')
        .style('fill', n => color(n.is_missing))
        .attr('r', inner_circos_radius)
    const inner_node_text = node_container
        .append('text')
        .attr('class', 'inner-node-text')
        .text(n => n.coverage.length >= 10 ? n.coverage.length : "")

    const node_circle = node_container
        .append("circle")
        .attr('class', 'node-circle')
        .attr("r", n => n.radius)
        .style("stroke", d => color(d.is_missing))
        .style('stroke-width', circle_stroke_width)
        .style("fill-opacity", 0)
        .call(d3cola.drag)
    node_circle
        .append("title")
        .text(d => `${d.repr}; Coverage: ${d.coverage.join(',')}`)
    node_container.each(d => build_circos(d))


    d3cola.on("tick", () => {
        path.each(d => {
            if (isIE()) this.parentNode.insertBefore(this, this)
        })
        // draw directed edges with proper padding from node centers
        path.attr('d', d => {
            const deltaX = d.target.x - d.source.x,
                deltaY = d.target.y - d.source.y,
                dist = Math.hypot(deltaX, deltaY),
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

        inner_node_circle.attr('cx', n => n.x)
        inner_node_circle.attr('cy', n => n.y)

        inner_node_text.attr('x', n => n.x)
        inner_node_text.attr('y', n => n.y)

    })
})

function node_radius(node) {
    return Math.sqrt(node.coverage.length) * 6 + circle_stroke_width
}
function isIE() {
    return ((navigator.appName == 'Microsoft Internet Explorer') || ((navigator.appName == 'Netscape') && (new RegExp("Trident/.*rv:([0-9]{1,}[\.0-9]{0,})").exec(navigator.userAgent) != null)))
}

function build_circos(node) {
    const container_id = `#circos-${node.id}`
    const circos = new Circos({
        container: container_id,
        width: node.width,
        height: node.height,
    })

    const layout_data = [{id: 'coverage-label', len: node.coverage.length}]


    const position_adjustment = (node.coverage.length + 1) / node.coverage.length
    const coverage_data = node.coverage.map((c, c_idx) => ({
        block_id: 'coverage-label',
        position: c_idx * position_adjustment,
        value: c
    }))
    const configuration = {
        innerRadius: node.radius,
        outerRadius: node.radius,
        ticks: {display: false,},
        clickCallback: null
    }

    const node_max = Math.max(node.coverage.reduce((max, val) => Math.max(max, val), 0), 2)

    circos.layout(layout_data, configuration)
        .line('coverage', coverage_data, {
            innerRadius: inner_circos_radius(node),
            outerRadius: node.radius - circle_stroke_width,
            min: 0,
            max: node_max,
            color: 'black',
            axes: [{spacing: 10}]
        })
        .render()

    // undo pesky default transform of circos plot
    const container = $(container_id)
    const svg = container.children('svg').first()
    const match = svg.children('.all')
        .attr('transform')
        .replace(/\s/g, '')
        .match(/([\d.]+),([\d.]+)/)
    container.attr('transform', `translate(${-match[1]},${-match[2]})`)
}

function inner_circos_radius(node) {
    return node.radius / 3
}
