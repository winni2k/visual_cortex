/**
 * Created by winni on 10/29/17.
 */

// set up legend form
const page_url = new URL(window.location.href)
const scale_node_by_area = page_url.searchParams.get("scale-node-area-by") || 'max-coverage'
$(`#scale-node-area-by-${scale_node_by_area}`).prop('checked', true)

const width = $(window).width() - 20,
    height = $(window).height() - 20,
    svg_width = width * 4,
    svg_height = height * 2

const d3cola = cola.d3adaptor(d3)
    .avoidOverlaps(true)
    .size([width, height])

const nav = d3.select(".vc_nav")
const legend_svg = d3.select('#legend-svg')
const svg = d3.select("#vc_graph_box").append("svg")
    .attr("width", svg_width)
    .attr("height", svg_height)

const circle_stroke_width = 0
const link_stroke_width = 24
const pie_chart_width = 24
const min_line_chart_width = 0
const node_scaling_factor = 75

function inner_circos_radius(node) {
    return 0
}


// floor avoids json file caching
d3.json(`graph.json?${Math.floor(Math.random() * 1000)}`, function (error, graph) {

    // graph.graph.color_scale = d3.scaleOrdinal(d3.schemeDark2).domain([...Array(graph.graph.colors.length).keys()])

    // pair some colors
    const paired = d3.schemePaired
    const region_cols = [paired[0], paired[2], paired[6], paired[8], paired[4], "#999999", paired[1], paired[3], paired[5]]

    graph.graph.color_scale = d3.scaleOrdinal(region_cols)

    // colorblind palette
    // const cbpalette = ["#999999", "#E69F00", "#56B4E9", "#009E73", "#F0E442", "#0072B2", "#D55E00", "#CC79A7"]
    // graph.graph.color_scale = d3.scaleOrdinal()
    //     .domain([...Array(graph.graph.colors.length).keys()])
    //     .range(cbpalette.slice(3, 8).concat(["#000000"]).concat(cbpalette.slice(0, 3)))

    // graph.graph.color_scale = d3.scaleOrdinal(
    //     d3.schemeGreys[7].slice(1, 7)
    //         .concat(d3.schemeReds[7].slice(1))
    //         .concat(d3.schemeBlues[5].slice(1))
    //         .concat(d3.schemeGreens[3].slice(1))
    //         .concat(d3.schemePurples[5].slice(1))
    // ).domain([...Array(graph.graph.colors.length).keys()])

    // legend
    build_legend(legend_svg, graph)

    // Not sure I'm using explicit node.id for link indexing,
    // so need to force ids of nodes to match index in node array
    for (const node_idx in graph.nodes) {
        const node = graph.nodes[node_idx]
        if (+node_idx !== +node.id) {
            throw RangeError("graph.node index mismatch\n" +
                `node with id ${node.id} is not number ${node_idx} in graph.nodes array`)
        }
    }
    graph.nodes.forEach(n => n.display = true)
    graph.nodes.forEach(n => n.n_kmers = n.coverage[0].length)
    graph.nodes.forEach(n => n.max_coverage = _.reduce(
        n.coverage,
        (max_val, row) => _.reduce(row, (row_max, num) => Math.max(row_max, num), max_val),
        0
        )
    )
    graph.nodes.forEach(n => n.mean_coverage = _.reduce(
        n.coverage,
        (row_sum, row) => Math.max(row_sum, _.reduce(row, (sum, num) => sum + num, 0)),
        1
        ) / n.n_kmers
    )

    if (scale_node_by_area === 'n-kmers') {
        graph.nodes.forEach(n => n.radius_scale = n.n_kmers)
    } else if (scale_node_by_area === 'mean-coverage') {
        graph.nodes.forEach(n => n.radius_scale = n.mean_coverage)
    } else {
        graph.nodes.forEach(n => n.radius_scale = n.max_coverage)
    }

    graph.nodes.forEach(n => n.radius = node_radius(n))
    graph.nodes.forEach(n => n.height = n.width = 2 * n.radius)
    graph.nodes.forEach(n =>
        n.is_missing = n.coverage.every(color_cov => color_cov.every(val => val === 0)))
    graph.nodes.forEach(n =>
        n.color_is_missing = n.coverage.map(color_cov => color_cov.every(val => val === 0)))
    graph.edges.forEach(e => e.connection_key = `${e.source}|${e.target}`)
    const edge_colors = new Map()
    graph.edges.forEach(e => {
        if (edge_colors.has(e.connection_key)) {
            edge_colors.get(e.connection_key).push(e.key)
        } else {
            edge_colors.set(e.connection_key, [e.key])
        }
    })

    const constraints = calculate_constraints(graph)

    d3cola
        .nodes(graph.nodes)
        .links(graph.edges)
        .flowLayout("x", l => l.source.radius + l.target.radius + 25)
        .constraints(constraints)
        .jaccardLinkLengths(160)
        .start(20, 20, 20)


    const path = svg.append('g')
        .attr('class', 'paths')
        .selectAll(".link")
        .data(graph.edges)
        .enter().append('svg:path')
        .attr('class', 'link')
        .attr('stroke', l => graph.graph.color_scale(l.key))
        .attr('stroke-width', link_stroke_width)
        .attr('style', l => `marker-end: url(#end-arrow-color-${l.key})`)

    const all_node_container = svg.append('g')
        .attr('class', 'nodes')
        .selectAll(".node")
        .data(graph.nodes)
        .enter()
        .append('g')
        .attr("class", "node")
        .attr('id', n => `node-${n.id}`)
        .on("click", d => {
            console.log(`clicked ${d.id}`)
            d.fixed = !d.fixed
            d3.select(`#node-${d.id}`).select('.node-circle').classed('clicked', d.fixed)
            copyTextToClipboard(d.unitig, '#selection')
        })
    const node_container = all_node_container.filter(n => n.display)

    const circos_container = node_container.append('g')
        .attr('id', n => `circos-container-${n.id}`)
    circos_container.append('g')
        .attr('id', n => `circos-${n.id}`)

    const inner_node_circle = node_container.append('circle')
        .attr('class', 'inner-node-circle')
        .attr('id', n => `inner-node-circle-${n.id}`)
        .attr('opacity', 1)
        .attr('r', inner_circos_radius)
    const inner_node_text = node_container
        .append('text')
        .attr('class', 'inner-node-text')
        .text(n => n.n_kmers)

    const node_circle = node_container
        .append("circle")
        .attr('class', 'node-circle')
        .attr("r", n => n.radius)
        .classed("is_missing", n => n.is_missing)
        .style('stroke-width', circle_stroke_width)
        .style("fill-opacity", 0)
        .call(d3cola.drag)
    node_circle
        .append("title")
        .text(d => `${d.repr}; Coverage: ${d.coverage.map(c => c.join(',')).join('\n')}`)
    node_container.each(d => build_circos(d, graph))

    function toggle_line_graphs(toggle_on) {
        let visibility = 'hidden'
        let new_radius = n => outer_line_graph_radius(n)
        let new_stroke = 'white'
        if (toggle_on) {
            visibility = 'visible'
            new_radius = inner_circos_radius
            new_stroke = 'black'
            set_text_font_size(inner_node_text, scale = false)
        } else {
            set_text_font_size(inner_node_text, scale = true)
        }

        for (let i of [...Array(graph.graph.colors.length).keys()]) {
            $(`.coverage-${i}`).attr('visibility', visibility)
        }
        $('.axis-ticks').attr('visibility', visibility)
        inner_node_circle
            .attr('r', new_radius)
            .attr('stroke', new_stroke)


    }

    $('#line-graphs-off').click(() => toggle_line_graphs(false))
    $('#line-graphs-on').click(() => toggle_line_graphs(true))
    $('#center-node-text-n-kmers').click(() => inner_node_text.text(n => n.n_kmers))
    $('#center-node-text-max-coverage').click(() => inner_node_text.text(n => n.max_coverage))
    $('#center-node-text-mean-coverage').click(() => inner_node_text.text(n => Math.round(n.mean_coverage)))
    $('#center-node-text-none').click(() => set_text_font_size(inner_node_text, scale = false,
        unscaled_font_size = '0px'))
    $('#scale-center-node-text-on').click(() => set_text_font_size(inner_node_text, scale = true))
    $('#scale-center-node-text-off').click(() => set_text_font_size(inner_node_text, scale = false,
        unscaled_font_size = '60px'))


    //toggle_line_graphs(false)

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
                targetPadding = d.target.radius + link_stroke_width,
                sourceX = d.source.x + (sourcePadding * normX),
                sourceY = d.source.y + (sourcePadding * normY),
                targetX = d.target.x - (targetPadding * normX),
                targetY = d.target.y - (targetPadding * normY),
                rotated = math.multiply([[0, -1], [1, 0]], [normX, normY]),
                connection_colors = edge_colors.get(d.connection_key),
                num_edges = connection_colors.length,
                edge_index = connection_colors.indexOf(d.key),
                edge_offset = (edge_index - (num_edges - 1) / 2) * link_stroke_width,
                sourceYOffset = sourceY + rotated[1] * edge_offset,
                targetYOffset = targetY + rotated[1] * edge_offset,
                sourceXOffset = sourceX + rotated[0] * edge_offset,
                targetXOffset = targetX + rotated[0] * edge_offset

            return `M ${sourceXOffset} ${sourceYOffset} L ${targetXOffset} ${targetYOffset}`
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

$('#simulation-button').click(() => {
    d3cola.stop()
    $(this).val('Continue simulation')
})

function set_text_font_size(text, scaled = true, unscaled_font_size = null) {
    if (scaled) {
        text.attr('font-size', n => `${100 * (outer_line_graph_radius(n) / inner_circos_radius(n))}%`)
    } else {
        text.attr('font-size', unscaled_font_size)
    }
}

function build_legend(legend_svg, graph) {
    const legend = legend_svg.append('g')
        .attr('class', 'legend')
        .attr("transform", "translate(0,30)")
    const box_width = 20
    const box_height = 15
    const box_vertical_padding = 2
    const legend_height = (box_height + box_vertical_padding) * graph.graph.sample_names.length
    const legend_width = Math.max(...graph.graph.sample_names.map(name => getTextWidth(name, `${box_height}px verdana`)))
    legend_svg.attr('height', legend_height + 20).attr('width', legend_width + box_width + 20)
    graph.graph.colors.map((color_idx, idx) => {
            const list_item = legend
                .append('g')
                .attr('transform', `translate(0,${idx * (box_height + box_vertical_padding)})`)
            list_item
                .append('rect').attr('width', box_width).attr('height', box_height)
                .attr('fill', graph.graph.color_scale(color_idx))
                .attr('transform', `translate(0,${-box_height})`)
            list_item
                .append('text')
                .attr('font-size', `${box_height}px`)
                .attr('transform', `translate(${box_width + 4},-2)`)
                .text(`${graph.graph.sample_names[idx]}`)

            // define arrow markers for graph links
            svg.append('svg:defs').append('svg:marker')
                .attr('id', `end-arrow-color-${color_idx}`)
                .attr('viewBox', '0 -5 10 10')
                .attr('refX', 0)
                .attr('markerWidth', 1)
                .attr('markerHeight', 1)
                .attr('orient', 'auto')
                .append('svg:path')
                .attr('d', 'M0,-5L10,0L0,5')
                .attr('fill', graph.graph.color_scale(color_idx))
        }
    )


}

// function node_radius(node) {
//     return outer_circos_radius(node) + circle_stroke_width
// }

function outer_circos_radius(node) {
    return node_radius(node) - circle_stroke_width
    // outer_line_graph_radius(node) + pie_chart_width
}

function outer_line_graph_radius(node) {
    return outer_circos_radius(node) - pie_chart_width
    // return inner_circos_radius(node) + scaled_radius(node.radius_scale)
}


function node_radius(node) {
    return circle_stroke_width + pie_chart_width + min_line_chart_width + Math.max(scaled_radius(node.radius_scale),
        inner_circos_radius(node))

}

function scaled_radius(value) {
    return Math.sqrt(value * node_scaling_factor)
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
    let axes = [
        {spacing: 10, thickness: 0.5, start: 10},
        {spacing: 50, thickness: 0.5, start: 50, color: 'black'},
    ]
    // workaround for nodes sized 1 kmer
    if (node.n_kmers === 1) {
        node.coverage.forEach((covs, cov_idx) => covs[0] === 0 ? null : axes.push({
            spacing: 1,
            thickness: 2.5,
            start: covs[0],
            end: covs[0] + 1,
            color: graph.graph.color_scale(cov_idx)
        }))
    }
    circos_layout.line(`axis-ticks`, coverage_data[0], {
        innerRadius: inner_circos_radius(node),
        outerRadius: node.radius - circle_stroke_width - pie_chart_width,
        min: 0,
        max: node_max,
        color: 'black',
        axes: axes
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
    container.attr('class', 'circos-container')
    const svg = container.children('svg').first()
    const match = svg.children('.all')
        .attr('transform')
        .replace(/\s/g, '')
        .match(/([\d.]+),([\d.]+)/)
    container.attr('transform', `translate(${-match[1]},${-match[2]})`)
}

function calculate_constraints(graph) {
    const pageBounds = {x: 0, y: 0, width: svg_width, height: svg_height},
        page = svg.append('rect').attr('id', 'page').attr('fill', 'white')
    console.log(page)
    for (var key in pageBounds) {
        page.attr(key, pageBounds[key])
    }

    const topLeft = {x: pageBounds.x, y: pageBounds.y, fixed: true, display: false},
        tlIndex = graph.nodes.push(topLeft) - 1,
        bottomRight = {
            x: pageBounds.x + pageBounds.width,
            y: pageBounds.y + pageBounds.height,
            fixed: true,
            display: false
        },
        brIndex = graph.nodes.push(bottomRight) - 1,
        constraints = []

    graph.nodes.forEach((node, i) => {
        if (node.display) {
            constraints.push({
                axis: 'x',
                type: 'separation',
                left: tlIndex,
                right: i,
                gap: node.radius
            })
            constraints.push({
                axis: 'y',
                type: 'separation',
                left: tlIndex,
                right: i,
                gap: node.radius
            })
            constraints.push({
                axis: 'x',
                type: 'separation',
                left: i,
                right: brIndex,
                gap: node.radius
            })
            constraints.push({
                axis: 'y',
                type: 'separation',
                left: i,
                right: brIndex,
                gap: node.radius
            })
        }
    })
    return constraints
}

function copyTextToClipboard(text, element) {
    const textArea = $(element)
    textArea.val(text)
    textArea.select()

    try {
        const successful = document.execCommand('copy')
        const msg = successful ? 'successful' : 'unsuccessful'
        console.log('Copying text command was ' + msg)
    } catch (err) {
        console.log('Oops, unable to copy')
    }
}


/**
 * Uses canvas.measureText to compute and return the width of the given text of given font in pixels.
 *
 * @param {String} text The text to be rendered.
 * @param {String} font The css font descriptor that text is to be rendered with (e.g. "bold 14px verdana").
 *
 * @see https://stackoverflow.com/questions/118241/calculate-text-width-with-javascript/21015393#21015393
 */
function getTextWidth(text, font) {
    // re-use canvas object for better performance
    var canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement("canvas"))
    var context = canvas.getContext("2d")
    context.font = font
    var metrics = context.measureText(text)
    return metrics.width
}
