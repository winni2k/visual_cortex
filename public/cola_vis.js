/**
 * Created by winni on 10/29/17.
 */
const width = $(window).width() - 20,
    height = $(window).height() - 20

const node_color = d3.scaleOrdinal(['black', d3.schemeCategory20[15]])
    .domain([false, true])

const d3cola = cola.d3adaptor(d3)
    .avoidOverlaps(true)
    .size([width, height])

const svg = d3.select("body").append("svg")
    .attr("width", width * 4)
    .attr("height", height)

const circle_stroke_width = 1
const pie_chart_width = 2
// floor avoids json file caching
d3.json(`graph.json?${Math.floor(Math.random() * 1000)}`, function (error, graph) {

    graph.graph.color_scale = d3.scaleOrdinal(d3.schemeCategory10)
        .domain([...Array(graph.graph.colors.length).keys()])

    // Not sure I'm using explicit node.id for link indexing,
    // so need to force ids of nodes to match index in node array
    for (const node_idx in graph.nodes) {
        const node = graph.nodes[node_idx]
        if (+node_idx !== +node.id) {
            throw RangeError("graph.node index mismatch\n" +
                `node with id ${node.id} is not number ${node_idx} in graph.nodes array`)
        }
    }
    graph.nodes.forEach(n => n.coverage = _.zip(...n.coverage))
    graph.nodes.forEach(n => n.n_kmers = n.coverage[0].length)
    graph.nodes.forEach(n => n.radius = node_radius(n))
    graph.nodes.forEach(n => n.height = n.width = 2 * n.radius)
    graph.nodes.forEach(n =>
        n.is_missing = n.coverage.every(color_cov => color_cov.every(val => val === 0)))
    graph.nodes.forEach(n =>
        n.color_is_missing = n.coverage.map(color_cov => color_cov.every(val => val === 0)))
    console.log(graph)
    //console.log(layoutSummary)

    const legend = svg.append('g')
        .attr('class', 'legend')
        .attr("transform", "translate(50,30)")
    const box_width = 20
    const box_height = 15
    graph.graph.colors.map((color_idx, idx) => {
            const list_item = legend
                .append('g')
                .attr('transform', `translate(0,${idx * (box_height + 2)})`)
            list_item
                .append('rect').attr('width', box_width).attr('height', box_height)
                .attr('fill', graph.graph.color_scale(color_idx))
                .attr('transform', `translate(0,${-box_height})`)
            list_item
                .append('text')
                .attr('font-size', `${box_height}px`)
                .attr('transform', `translate(${box_width + 4},-2)`)
                .text(`${graph.graph.sample_names[idx]}`)
        }
    )


    d3cola
        .nodes(graph.nodes)
        .links(graph.edges)
        .flowLayout("x", l => l.source.radius + l.target.radius + 20)
        .symmetricDiffLinkLengths(1)
        .start(10, 20, 20)

    // define arrow markers for graph links
    svg.append('svg:defs').append('svg:marker')
        .attr('id', 'end-arrow')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 6)
        .attr('markerWidth', 2)
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
        .attr('stroke', l => graph.graph.color_scale(l.key))

    const node_container = svg.append('g')
        .attr('class', 'nodes')
        .selectAll(".node")
        .data(graph.nodes)
        .enter()
        .append('g')
        .attr("class", "node")
        .attr('id', n => `node-${n.id}`)
        .on("click", d => {
            console.log('clicked')
            d.fixed = !d.fixed
        })

    const circos_container = node_container.append('g')
        .attr('id', n => `circos-container-${n.id}`)
    circos_container.append('g')
        .attr('id', n => `circos-${n.id}`)

    const inner_node_circle = node_container.append('circle')
        .attr('class', 'inner-node-circle')
        .attr('id', n => `inner-node-circle-${n.id}`)
        .style('fill', n => node_color(n.is_missing))
        .attr('opacity', 0.5)
        .attr('r', inner_circos_radius)
    const inner_node_text = node_container
        .append('text')
        .attr('class', 'inner-node-text')
        .text(n => n.n_kmers >= 10 ? n.n_kmers : "")

    const node_circle = node_container
        .append("circle")
        .attr('class', 'node-circle')
        .attr("r", n => n.radius)
        .style("stroke", n => node_color(n.is_missing))
        .style('stroke-width', circle_stroke_width)
        .style("fill-opacity", 0)
        .call(d3cola.drag)
    node_circle
        .append("title")
        .text(d => `${d.repr}; Coverage: ${d.coverage.map(c => c.join(',')).join('\n')}`)
    node_container.each(d => build_circos(d, graph))


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
                color_band_factor = 2.2,
                sourceX = d.source.x + (sourcePadding * normX),
                sourceY = d.source.y + (sourcePadding * normY),
                targetX = d.target.x - (targetPadding * normX),
                targetY = d.target.y - (targetPadding * normY),
                sourceYOffset = sourceY + (d.key - graph.graph.colors.length / 2) * color_band_factor,
                targetYOffset = targetY + (d.key - graph.graph.colors.length / 2) * color_band_factor

            return `M ${sourceX} ${sourceYOffset} L ${targetX} ${targetYOffset}`
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
    return Math.sqrt(node.n_kmers) * 6 + circle_stroke_width
}
function isIE() {
    return ((navigator.appName == 'Microsoft Internet Explorer') || ((navigator.appName == 'Netscape') && (new RegExp("Trident/.*rv:([0-9]{1,}[\.0-9]{0,})").exec(navigator.userAgent) != null)))
}

function build_circos(node, graph) {
    const container_id = `#circos-${node.id}`
    const circos = new Circos({
        container: container_id,
        width: node.width,
        height: node.height,
    })

    const layout_data = [{id: 'coverage-label', len: node.n_kmers}]

    const position_adjustment = (node.n_kmers + 1) / node.n_kmers
    const coverage_data = node.coverage.map(color_cov =>
        color_cov.map((c, c_idx) => ({
            block_id: 'coverage-label',
            position: c_idx * position_adjustment,
            value: c
        })))

    const color_pie_length = node.n_kmers / graph.graph.colors.length
    const color_data = node.color_is_missing.map(
        (is_missing, color_idx) => (
            {
                block_id: 'coverage-label',
                start: color_idx * color_pie_length,
                end: (color_idx + 1) * color_pie_length,
                color: is_missing ? 'white' : graph.graph.color_scale(color_idx),
            }
        )
    )

    const configuration = {
        innerRadius: node.radius,
        outerRadius: node.radius,
        ticks: {display: false,},
        clickCallback: null
    }

    const node_max = Math.max(node.coverage.reduce(
        (max, val) =>
            val.reduce((max_i, val_i) => Math.max(max_i, val_i), max),
        0),
        2)


    const circos_layout = circos.layout(layout_data, configuration)
    circos_layout.line(`axis-ticks`, coverage_data[0], {
        innerRadius: inner_circos_radius(node),
        outerRadius: node.radius - circle_stroke_width - pie_chart_width,
        min: 0,
        max: node_max,
        color: 'black',
        axes: [{spacing: 10, thickness: 0.1}]
    })

    coverage_data.forEach((cov_dat, cov_dat_idx) =>
        circos_layout.line(`coverage-${cov_dat_idx}`, coverage_data[cov_dat_idx], {
            innerRadius: inner_circos_radius(node),
            outerRadius: node.radius - circle_stroke_width - pie_chart_width,
            min: 0,
            max: node_max,
            color: d => node.color_is_missing[cov_dat_idx] ? 'white' : graph.graph.color_scale(cov_dat_idx),
        })
    )
    circos_layout.highlight('color-pie-chart', color_data, {
        innerRadius: node.radius - circle_stroke_width - pie_chart_width,
        outerRadius: node.radius,
        color: d => d.color,
    })
    circos_layout.render()

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
